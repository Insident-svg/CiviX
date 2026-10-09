const API_URL = (import.meta.env.VITE_API_URL || "https://civixhelpme.netlify.app || http://localhost:5173").replace(/\/$/, "");

export type User = {
  _id?: string; id?: string; name: string; username: string; email?: string; role: "citizen" | "officer" | "admin"; governmentId?: string | null;
  emailVerified?: boolean; profileImage?: string; stats?: { total:number; resolved:number; pending:number; inProgress:number };
};
export type GeoPoint = { type?: string; coordinates?: number[] };
export type Grievance = {
  _id?: string; postId?: string | null; grievanceId: string; text: string; title?: string; summary?: string; status: string; category?: string; subCategory?: string; severity?: string;
  impactScore?: number; language?: string; aiConfidence?: {category?:number; severity?:number; impact?:number}; aiHumanReview?: boolean;
  aiReviewReasons?: string[]; isEmergency?: boolean; departments?: string[]; location?: GeoPoint;
  media?: Array<{type:string; url:string; mimeType?:string; size?:number}>; acknowledgedAt?: string; upvoteCount?: number; downvoteCount?: number; commentCount?: number; engagementScore?: number; myVote?: "upvote" | "downvote" | null;
  createdAt?: string; updatedAt?: string; slaDeadline?: string; masterIncidentId?: string;
  userId?: User | string; departmentId?: {name?:string; code?:string} | string; wardId?: {name?:string; code?:string} | string;
  officerId?: {userId?: User; _id?:string; team?:string} | string;
  resolutionEvidence?: { _id?:string; resolutionDescription?:string; afterUrl?:string; verified?:boolean; capturedAt?:string; createdAt?:string } | null;
  poc?: { name?:string; designation?:string; department?:string; officialContact?:string; officeHours?:string; assignedAt?:string; isDemo?:boolean } | null;
  whatsappUpdatesEnabled?: boolean;
  whatsappConsentAt?: string;
};

export type PublicStats = { total:number; resolved:number; resolutionRate:number; satisfaction:number|null; averageResponseHours:number|null };
export type AIAnalysis = {
  grievanceId:string; language:string; title:string; summary:string; transcript?:string | null; category:string; subCategory?:string; secondaryCategories?:string[]; severity:string;
  departments:string[]; isEmergency:boolean; impactScore:number; confidence:{category:number;severity:number;impact:number};
  humanReview:boolean; reviewReasons:string[]; duplicate?:{isDuplicate:boolean;masterIncidentId?:string|null;similarity:number};
};

export function setGlobalLoading(active: boolean) {
  const bar = document.getElementById("page-loading-bar");
  if (!bar) return;
  const key = "__civixLoadingCount";
  const current = Number((window as any)[key] || 0);
  const next = Math.max(0, current + (active ? 1 : -1));
  (window as any)[key] = next;
  bar.classList.toggle("is-active", next > 0);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  setGlobalLoading(true);
  const token = localStorage.getItem("civix_token");
  const headers = new Headers(options.headers);
  if (options.body && !(options.body instanceof FormData)) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  try {
    const response = await fetch(`${API_URL}${path}`, {...options, headers});
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(body?.error?.message || body?.message || `Request failed (${response.status})`);
      (error as Error & { status?: number }).status = response.status;
      throw error;
    }
    return body?.data ?? body;
  } finally {
    setGlobalLoading(false);
  }
}

export const api = {
  public: {
    stats: () => request<PublicStats>('/api/public/stats'),
    map: (params: URLSearchParams) => request<any[]>(`/api/public/map/incidents?${params.toString()}`),
  },
  auth: {
    register: (payload: {name:string; username:string; email:string; password:string}) => request<{userId:string; email:string; emailVerified:boolean}>("/api/auth/register", {method:"POST", body:JSON.stringify(payload)}),
    resendVerification: (email:string) => request<{sent:boolean}>("/api/auth/resend-verification", {method:"POST", body:JSON.stringify({email})}),
    login: (identifier:string, password:string) => request<{token:string; user:User}>("/api/auth/login", {method:"POST", body:JSON.stringify({identifier, password})}),
    googleLogin: (credential:string) => request<{token:string; user:User}>("/api/auth/google", {method:"POST", body:JSON.stringify({credential})}),
    forgotPassword: (email:string) => request<{sent:boolean}>("/api/auth/forgot-password", {method:"POST", body:JSON.stringify({email})}),
    resetPassword: (email:string, token:string, newPassword:string) => request<{reset:boolean}>("/api/auth/reset-password", {method:"POST", body:JSON.stringify({email, token, newPassword})}),
    me: () => request<User>("/api/auth/me"),
    logout: () => request<{loggedOut:boolean}>("/api/auth/logout", {method:"POST"}),
  },
  grievances: {
    create: (payload: any) => request<Grievance>("/api/grievances", {method:"POST", body:JSON.stringify(payload)}),
    analyzePreview: (payload:any) => request<AIAnalysis>("/api/grievances/analyze-preview", {method:"POST", body:JSON.stringify(payload)}),
    list: (params: URLSearchParams) => request<{items:Grievance[]; nextPage:number|null; total?:number}>(`/api/grievances?${params.toString()}`),
    get: (id:string) => request<Grievance>(`/api/grievances/${encodeURIComponent(id)}`),
    dispute: (id:string, reason:string) => request<Grievance>(`/api/grievances/${encodeURIComponent(id)}/dispute`, {method:"POST", body:JSON.stringify({reason})}),
    updateStatus: (id:string,status:string) => request<Grievance>(`/api/grievances/${encodeURIComponent(id)}/status`, {method:"PATCH", body:JSON.stringify({status})}),
    assignPoc: (id:string,payload:{name:string;designation:string;department:string;officialContact:string;officeHours:string;isDemo?:boolean}) => request<Grievance>(`/api/grievances/${encodeURIComponent(id)}/poc`, {method:"PATCH", body:JSON.stringify(payload)}),
    resolution: (id:string,payload:{resolutionDescription:string}) => request<any>(`/api/grievances/${encodeURIComponent(id)}/resolution`, {method:"POST", body:JSON.stringify(payload)}),
    finalizeResolution: (id:string,payload:{afterUrl:string; latitude?:number; longitude?:number}) => request<any>(`/api/grievances/${encodeURIComponent(id)}/resolution/photo`, {method:"POST", body:JSON.stringify(payload)}),
    verify: (id:string,decision:"approve"|"reopen") => request<Grievance>(`/api/grievances/${encodeURIComponent(id)}/verify`, {method:"PATCH", body:JSON.stringify({decision})}),
  },
  emergency: {
    overview: () => request<any>('/api/emergency/overview'),
    createReport: (payload:any) => request<any>('/api/emergency/reports', {method:'POST', body:JSON.stringify(payload)}),
    linkReport: (id:string,incidentId:string) => request<any>(`/api/emergency/reports/${encodeURIComponent(id)}/link-incident`, {method:'POST', body:JSON.stringify({incidentId})}),
    createIncident: (payload:any) => request<any>('/api/emergency/incidents', {method:'POST', body:JSON.stringify(payload)}),
    activateIncident: (id:string) => request<any>(`/api/emergency/incidents/${encodeURIComponent(id)}/activate`, {method:'POST', body:JSON.stringify({})}),
    createResource: (payload:any) => request<any>('/api/emergency/resources', {method:'POST', body:JSON.stringify(payload)}),
    simulate: () => request<any>('/api/emergency/simulate', {method:'POST', body:JSON.stringify({})}),
    optimize: (simulationMode=false) => request<any>('/api/emergency/allocations/optimize', {method:'POST', body:JSON.stringify({simulationMode})}),
    approvePlan: (id:string) => request<any>(`/api/emergency/allocations/${encodeURIComponent(id)}/approve`, {method:'POST', body:JSON.stringify({})}),
    updateAssignment: (id:string,status:string,note='') => request<any>(`/api/emergency/assignments/${encodeURIComponent(id)}/status`, {method:'PATCH', body:JSON.stringify({status,note})}),
    recordRelief: (payload:any) => request<any>('/api/emergency/relief', {method:'POST', body:JSON.stringify(payload)}),
  },
  feed: (params: URLSearchParams) => request<{items:Grievance[]; nextPage:number|null}>(`/api/feed?${params.toString()}`),
  posts: (params: URLSearchParams) => request<{items:any[];nextPage:number|null}>(`/api/posts?${params.toString()}`),
  notifications: (params: URLSearchParams) => request<{items: any[];
    nextPage: number | null;
    total: number;}>(`/api/notifications?${params.toString()}`),
  markNotificationRead: (id:string) => request<any>(`/api/notifications/${encodeURIComponent(id)}/read`, {method:"PATCH"}),
  markAllNotificationsRead: () => request<any>(`/api/notifications/read-all`, {method:"PATCH"}),
  profile: () => request<any>("/api/users/me"),
  gamification: {
    me: () => request<any>("/api/gamification/me"),
    leaderboard: (limit=10) => request<any[]>(`/api/gamification/leaderboard?limit=${limit}`),
    challenges: () => request<any[]>("/api/gamification/challenges"),
    certificates: () => request<any[]>("/api/gamification/certificates"),
  },
  updateProfile: (payload:any) => request<User>("/api/users/me", {method:"PATCH", body:JSON.stringify(payload)}),
  upload: async (files: File[]) => { const form = new FormData(); files.forEach(f => form.append("files", f)); return request<{items:any[]}>("/api/media", {method:"POST", body:form}); },
  officerDashboard: () => request<any>("/api/officer/dashboard"),
  officerIncidents: (params:URLSearchParams) => request<{items:Grievance[];nextPage:number|null;total?:number}>(`/api/grievances?${params.toString()}`),
  map: (params: URLSearchParams) => request<any[]>(`/api/map/incidents?${params.toString()}`),
  votes: {
    get: (postId:string) => request<any>(`/api/votes?postId=${encodeURIComponent(postId)}`),
    vote: (postId:string,type:"upvote"|"downvote") => request<any>("/api/votes", {method:"POST",body:JSON.stringify({postId,type})}),
    remove: (postId:string) => request<any>(`/api/votes?postId=${encodeURIComponent(postId)}`, {method:"DELETE"}),
  },
  comments: {
    list: (postId:string) => request<{items:any[];nextPage:number|null}>(`/api/comments?postId=${encodeURIComponent(postId)}`),
    add: (postId:string,text:string) => request<any>("/api/comments", {method:"POST",body:JSON.stringify({postId,text})}),
  },
  assistant: { ask: (message:string, location?: {latitude:number;longitude:number}) => request<{response:string;context:any}>("/api/assistant", {method:"POST",body:JSON.stringify({message, location})}), },
  admin: {
    overview: () => request<any>("/api/admin/overview"), users: (search="") => request<any>(`/api/admin/users?search=${encodeURIComponent(search)}`), departments: () => request<any>("/api/admin/departments"), analytics: () => request<any>("/api/admin/analytics"), audit: (params:URLSearchParams) => request<any>(`/api/admin/audit?${params.toString()}`),
    governmentAccounts: () => request<any>("/api/admin/government-accounts"),
    systemOverview: () => request<any>("/api/admin/system-overview"),
    slaConfigs: () => request<any>("/api/admin/sla-configs"),
    createSlaConfig: (payload:any) => request<any>("/api/admin/sla-configs", {method:"POST", body:JSON.stringify(payload)}),
    updateSlaConfig: (id:string,payload:any) => request<any>(`/api/admin/sla-configs/${encodeURIComponent(id)}`, {method:"PATCH", body:JSON.stringify(payload)}),
    createGovernmentAccount: (payload:any) => request<any>("/api/admin/government-accounts", {method:"POST", body:JSON.stringify(payload)}),
    assignGrievance: (id:string, payload:any) => request<Grievance>(`/api/admin/grievances/${encodeURIComponent(id)}/assign`, {method:"PATCH", body:JSON.stringify(payload)}),
    moderation: () => request<any>("/api/admin/moderation"), moderate: (id:string,moderated:boolean) => request<any>(`/api/admin/moderation/${encodeURIComponent(id)}`, {method:"PATCH",body:JSON.stringify({moderated})}), aiReview: () => request<any>("/api/admin/ai-review"), decideAI: (id:string,decision:string) => request<any>(`/api/admin/ai-review/${encodeURIComponent(id)}`, {method:"PATCH",body:JSON.stringify({decision})}),
  },
};
export { API_URL };
