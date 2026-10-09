import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type AriaRole,
  type FormEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";

import civixLogoMark from "./imports/civix-logo-mark.svg";
import defaultAvatar from "./assets/default-avatar.svg";
import eagleProfile from "./assets/eagle-profile.webp";
import cityGuardianBadge from "./assets/badges/city-guardian.jpeg";
import communityHelperBadge from "./assets/badges/community-helper.jpeg";
import firstFixBadge from "./assets/badges/first-fix.jpeg";
import newbieBadge from "./assets/badges/newbie.jpeg";
import potholeHunterBadge from "./assets/badges/pothole-hunter.jpeg";
import steadyCitizenBadge from "./assets/badges/steady-citizen.jpeg";
import EmergencyCenter from "./EmergencyCenter";

import { api, setGlobalLoading, type Grievance, type User, type AIAnalysis } from "./services/api";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: { client_id: string; callback: (response: { credential: string }) => void }) => void;
          renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
        };
      };
    };
  }
}

const GOOGLE_CLIENT_ID =
  (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim() ||
  "771347281852-4inp22qhrrpp6rffocb2rnhasf9834rf.apps.googleusercontent.com";

function loadGoogleIdentityScript(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-civix-google]') as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Google Sign-In could not load.")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.dataset.civixGoogle = "true";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Google Sign-In could not load."));
    document.head.appendChild(script);
  });
}

const BADGE_IMAGE_BY_ID: Record<string, string> = {
  newbie: newbieBadge,
  "first-fix": firstFixBadge,
  "pothole-hunter": potholeHunterBadge,
  "five-fixes": communityHelperBadge,
  "twenty-five-fixes": cityGuardianBadge,
  "steady-citizen": steadyCitizenBadge,
};

function getBadgeImage(badge: any): string | undefined {
  if (!badge) return undefined;
  return BADGE_IMAGE_BY_ID[String(badge.id || "")] || undefined;
}

type Role = "citizen" | "officer" | "admin";
type LocationState = { latitude:number; longitude:number; accuracy:number } | null;

function useLiveLocation(enabled = true) {
  const [location, setLocation] = useState<LocationState>(null);
  const [locationError, setLocationError] = useState("");
  useEffect(() => {
    if (!enabled || !navigator.geolocation) { setLocationError("Live location is not supported by this browser."); return; }
    const watch = navigator.geolocation.watchPosition(
      p => { setLocation({ latitude:p.coords.latitude, longitude:p.coords.longitude, accuracy:p.coords.accuracy }); setLocationError(""); },
      e => setLocationError(e.message || "Location permission is required."),
      { enableHighAccuracy:true, maximumAge:10000, timeout:15000 },
    );
    return () => navigator.geolocation.clearWatch(watch);
  }, [enabled]);
  return { location, locationError };
}

type Screen =
  | "landing"
  | "login"
  | "register"
  | "email-sent"
  | "verify-email"
  | "forgot"
  | "reset"
  | "reset-success"
  | "home"
  | "feed"
  | "nearby"
  | "grievances"
  | "detail"
  | "report"
  | "success"
  | "notifications"
  | "profile"
  | "impact"
  | "dashboard"
  | "system-overview"
  | "incidents"
  | "acknowledge"
  | "incident"
  | "resolution"
  | "map"
  | "analytics"
  | "ai-review"
  | "audit"
  | "moderation"
  | "users"
  | "departments"
  | "sla"
  | "sla-config"
  | "resolved"
  | "emergency"
  | "emergency-report"
  | "emergency-success";

const civicPhoto =
  "https://images.unsplash.com/photo-1753127096071-55bebb47d9f2?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=85&w=1200";
const streetPhoto =
  "https://images.unsplash.com/photo-1771429631978-674f8689aca6?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=85&w=1200";

const iconPaths: Record<string, ReactNode> = {
  home: <><path d="m3 10 9-7 9 7"/><path d="M5 9v11h14V9"/><path d="M9 20v-7h6v7"/></>,
  feed: <><path d="M4 5h16M4 12h16M4 19h10"/></>,
  map: <><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3Z"/><path d="M9 3v15m6-12v15"/></>,
  report: <><path d="M12 5v14M5 12h14"/></>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></>,
  user: <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
  eye: <><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.5"/></>,
  "eye-off": <><path d="m3 3 18 18"/><path d="M10.6 6.2A10.8 10.8 0 0 1 12 6c6 0 9.5 6 9.5 6a17.6 17.6 0 0 1-3 3.4M6.2 6.2C3.7 7.9 2.5 12 2.5 12a17.6 17.6 0 0 0 5.2 4.5A9.8 9.8 0 0 0 12 18c1.2 0 2.3-.2 3.3-.6"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></>,
  search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
  arrow: <><path d="m5 12 14 0"/><path d="m13 6 6 6-6 6"/></>,
  check: <path d="m5 12 4 4L19 6"/>,
  clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  pin: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>,
  vote: <><path d="m12 4 7 8h-4v8H9v-8H5Z"/></>,
  comment: <path d="M21 12a8 8 0 0 1-8 8H5l-2 2v-10a9 9 0 1 1 18 0Z"/>,
  share: <><circle cx="18" cy="5" r="2"/><circle cx="6" cy="12" r="2"/><circle cx="18" cy="19" r="2"/><path d="m8 11 8-5m-8 7 8 5"/></>,
  camera: <><path d="M4 7h4l2-3h4l2 3h4v13H4Z"/><circle cx="12" cy="13" r="4"/></>,
  mic: <><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></>,
  video: <><rect x="3" y="6" width="13" height="12" rx="2"/><path d="m16 10 5-3v10l-5-3Z"/></>,
  upload: <><path d="M12 16V4m0 0L7 9m5-5 5 5"/><path d="M5 20h14"/></>,
  filter: <><path d="M4 6h16M7 12h10M10 18h4"/></>,
  dashboard: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
  users: <><circle cx="9" cy="8" r="3"/><path d="M3 19a6 6 0 0 1 12 0"/><path d="M16 5a3 3 0 0 1 0 6m1 3a5 5 0 0 1 4 5"/></>,
  chart: <><path d="M4 20V10m6 10V4m6 16v-7m4 7H2"/></>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="M19 13.5v-3l-2-.7-.7-1.8.9-2-2.2-2-1.8 1H11L9.3 4 7 6l.8 2-.8 1.8-2 .7v3l2 .7.8 1.8L7 18l2.3 2 1.7-1h2.2l1.8 1 2.2-2-.9-2 .7-1.8Z"/></>,
  shield: <><path d="M12 3 4 6v5c0 5 3.4 8.5 8 10 4.6-1.5 8-5 8-10V6Z"/><path d="m9 12 2 2 4-5"/></>,
  moon: <path d="M20 15a8 8 0 1 1-11-11 8 8 0 0 0 11 11Z"/>,
  sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></>,
  logout: <><path d="M10 5H5v14h5"/><path d="M13 8l4 4-4 4m4-4H9"/></>,
};

function Icon({ name, size = 20 }: { name: string; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{iconPaths[name] ?? iconPaths.check}</svg>;
}

function Mark({ size = 42 }: { size?: number }) {
  return <img className="brand-mark" width={size} height={size} src={civixLogoMark} alt="CiviX logo"/>;
}

function Logo({ inverse = false, tagline = false }: { inverse?: boolean; tagline?: boolean }) {
  return <div className={`logo ${inverse ? "inverse" : ""}`}><span className="mark-wrap"><Mark /></span><span><b>Civi<span>X</span></b>{tagline && <small>Connect. Report. Resolve.</small>}</span></div>;
}

function Button({ children, variant = "primary", icon, onClick, type = "button", disabled = false, className = "" }: { children: ReactNode; variant?: "primary" | "secondary" | "ghost" | "accent"; icon?: string; onClick?: () => void; type?: "button" | "submit"; disabled?: boolean; className?: string }) {
  return <button type={type} className={`btn btn-${variant} ${className}`} onClick={onClick} disabled={disabled}>{icon && <Icon name={icon} size={18}/>}<span>{children}</span></button>;
}

function Status({ children, tone = "blue" }: { children: ReactNode; tone?: "blue" | "orange" | "green" | "red" | "sky" | "neutral" }) {
  return <span className={`status status-${tone}`}>{children}</span>;
}

function Avatar({ initials = "AK", small = false, src, useDefault = false }: { initials?: string; small?: boolean; src?: string | null; useDefault?: boolean }) {
  const image = src || (useDefault ? defaultAvatar : "");
  return <span className={`avatar ${small ? "avatar-small" : ""}`}>{image ? <img src={image} alt="Profile"/> : initials}</span>;
}

function Field({
  label,
  placeholder,
  type = "text",
  value,
  onChange,
}: {
  label: string;
  placeholder?: string;
  type?: string;
  value?: string;
  onChange?: (value: string) => void;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword && showPassword ? "text" : type;

  return (
    <label className={`field ${isPassword ? "field-password" : ""}`}>
      <span>{label}</span>
      <div className="password-input-wrap">
        <input
          type={inputType}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          autoComplete={isPassword ? "current-password" : undefined}
        />
        {isPassword && (
          <button
            type="button"
            className="password-toggle"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            title={showPassword ? "Hide password" : "Show password"}
          >
            <Icon name={showPassword ? "eye-off" : "eye"} size={19} />
          </button>
        )}
      </div>
    </label>
  );
}

function Card({ children, className = "", onClick, role }: { children: ReactNode; className?: string; onClick?: () => void; role?: AriaRole }) {
  return <div className={`card ${className} ${onClick ? "card-clickable" : ""}`} onClick={onClick} role={role}>{children}</div>;
}

function Metric({ label, value, detail, tone = "" }: { label: string; value: string; detail?: string; tone?: string }) {
  return <Card className={`metric ${tone}`}><span>{label}</span><strong>{value}</strong>{detail && <small>{detail}</small>}</Card>;
}

function CircularChart({ value, label, detail, size = 104 }: { value: number; label: string; detail?: string; size?: number }) {
  return <div className="circular-chart" tabIndex={0} aria-label={`${label}: ${value}%${detail ? `, ${detail}` : ""}`}>
    <svg width={size} height={size} viewBox="0 0 120 120" role="img">
      <circle className="ring-track" cx="60" cy="60" r="49" pathLength="100"/>
      <circle className="ring-value" cx="60" cy="60" r="49" pathLength="100" strokeDasharray={`${value} ${100-value}`}/>
    </svg>
    <span><b>{value}%</b><small>{label}</small></span>
  </div>;
}

function Sparkline({ label, values }: { label: string; values: number[] }) {
  const width=240;
  const height=70;
  const max=Math.max(...values);
  const min=Math.min(...values);
  const points=values.map((value,index)=>{
    const x=(index/(values.length-1))*width;
    const y=height-8-((value-min)/(max-min||1))*(height-18);
    return `${x},${y}`;
  }).join(" ");
  return <div className="sparkline" tabIndex={0} aria-label={`${label}: upward ${values[values.length-1]-values[0]} percent this period`}>
    <div><span>{label}</span><b>+{values[values.length-1]-values[0]}%</b></div>
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label={`${label} trend`}>
      <defs><linearGradient id={`spark-${label.replace(/\s/g,"-")}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="currentColor" stopOpacity=".24"/><stop offset="1" stopColor="currentColor" stopOpacity="0"/></linearGradient></defs>
      <polygon points={`0,${height} ${points} ${width},${height}`} fill={`url(#spark-${label.replace(/\s/g,"-")})`}/>
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
      {points.split(" ").map((point,index)=>{const [cx,cy]=point.split(",");return <circle key={index} cx={cx} cy={cy} r={index===values.length-1?"4":"2"} fill="currentColor"><title>{values[index]} reports</title></circle>})}
    </svg>
  </div>;
}

let leafletPromise: Promise<any> | null = null;
function loadLeaflet() {
  if ((window as any).L) return Promise.resolve((window as any).L);
  if (leafletPromise) return leafletPromise;
  leafletPromise = new Promise((resolve, reject) => {
    if (!document.querySelector('link[data-civix-leaflet]')) {
      const link = document.createElement('link'); link.rel='stylesheet'; link.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'; link.dataset.civixLeaflet='true'; document.head.appendChild(link);
    }
    const existing=document.querySelector('script[data-civix-leaflet]') as HTMLScriptElement|null;
    if(existing){existing.addEventListener('load',()=>resolve((window as any).L)); existing.addEventListener('error',()=>reject(new Error('Map library failed to load'))); return;}
    const script=document.createElement('script'); script.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'; script.async=true; script.dataset.civixLeaflet='true'; script.onload=()=>resolve((window as any).L); script.onerror=()=>reject(new Error('Map library failed to load')); document.head.appendChild(script);
  });
  return leafletPromise;
}
function escapeHtml(value:string){return value.replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]||c));}
function CityMap({ compact = false, onMarker, location, publicOnly = false, selectable = false, selectedLocation, onSelectLocation }: { compact?: boolean; onMarker?: (id?:string) => void; location?: LocationState; publicOnly?: boolean; selectable?: boolean; selectedLocation?: {latitude:number;longitude:number}|null; onSelectLocation?: (lat:number,lng:number)=>void }) {
  const mapRef=useRef<HTMLDivElement|null>(null), leafletRef=useRef<any>(null), layerRef=useRef<any>(null);
  const [incidents,setIncidents]=useState<any[]>([]), [mapError,setMapError]=useState('');
  useEffect(()=>{let cancelled=false; loadLeaflet().then(L=>{if(cancelled||!mapRef.current||leafletRef.current)return; const map=L.map(mapRef.current,{zoomControl:!compact,attributionControl:true,preferCanvas:true}); L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>'}).addTo(map); layerRef.current=L.layerGroup().addTo(map); leafletRef.current=map; map.setView([20.5937,78.9629],5); setTimeout(()=>map.invalidateSize(),100);}).catch(e=>!cancelled&&setMapError(e.message)); return()=>{cancelled=true;if(leafletRef.current){leafletRef.current.remove();leafletRef.current=null;layerRef.current=null;}};},[compact]);
  useEffect(()=>{const p=new URLSearchParams({limit:'200'});if(location){p.set('lat',String(location.latitude));p.set('lng',String(location.longitude));p.set('radius',compact?'5000':'15000');}const request=!publicOnly && localStorage.getItem('civix_token')?api.map(p):api.public.map(p);request.then(setIncidents).catch(()=>setIncidents([]));},[location?.latitude,location?.longitude,compact]);
  useEffect(()=>{const map=leafletRef.current,layer=layerRef.current,L=(window as any).L;if(!map||!layer||!L)return;
  if(selectable && onSelectLocation){ map.off("click"); map.on("click",(e:any)=>onSelectLocation(e.latlng.lat,e.latlng.lng)); }layer.clearLayers();const points:any[]=[];incidents.forEach((item,i)=>{const coords=item.location?.coordinates;if(!Array.isArray(coords)||coords.length!==2)return;const [lng,lat]=coords;if(!Number.isFinite(lat)||!Number.isFinite(lng))return;points.push([lat,lng]);const sev=String(item.severity||'medium').toLowerCase();const color=sev==='critical'?'#b91c1c':sev==='high'?'#ea580c':sev==='low'?'#16a34a':'#2563eb';const marker=L.circleMarker([lat,lng],{radius:compact?7:9,color,fillColor:color,fillOpacity:.9,weight:2});marker.bindPopup(`<strong>${escapeHtml(item.grievanceId||`Incident ${i+1}`)}</strong><br>${escapeHtml(item.category||'Civic issue')}<br>${escapeHtml(String(item.status||'Reported').replaceAll('_',' '))}`);if(onMarker)marker.on('click',()=>onMarker(item._id||item.grievanceId));marker.addTo(layer);});if(selectedLocation){const selected=L.circleMarker([selectedLocation.latitude,selectedLocation.longitude],{radius:10,color:"#111827",fillColor:"#f97316",fillOpacity:1,weight:3});selected.bindPopup(`<strong>Selected incident location</strong>`);selected.addTo(layer);points.push([selectedLocation.latitude,selectedLocation.longitude]);}
  if(location){const live=L.circleMarker([location.latitude,location.longitude],{radius:8,color:'#0f172a',fillColor:'#38bdf8',fillOpacity:1,weight:3});live.bindPopup(`<strong>Your live location</strong><br>Accuracy ±${Math.round(location.accuracy)}m`);live.addTo(layer);points.push([location.latitude,location.longitude]);}if(points.length)map.fitBounds(L.latLngBounds(points),{padding:[compact?18:35,compact?18:35],maxZoom:compact?15:16});setTimeout(()=>map.invalidateSize(),100);},[incidents,location?.latitude,location?.longitude,compact,onMarker,selectable,selectedLocation?.latitude,selectedLocation?.longitude,onSelectLocation]);
  return <div className={`city-map real-city-map ${compact?'compact-map':''} ${selectable?'selectable-map':''}`}><div ref={mapRef} className="leaflet-host"/>{mapError&&<div className="map-empty">Unable to load the map. Check your internet connection.</div>}{!mapError&&!incidents.length&&<div className="map-status">{location?'No civic incidents reported near your live location yet.':'Live incidents will appear here.'}</div>}{!compact&&<div className="map-label label-one">LIVE CIVIC MAP</div>}</div>;
}
function Footer({ compact=false }: { compact?:boolean }){return <footer className={`site-footer ${compact?'site-footer-compact':''}`}><div><Logo inverse tagline/><p>Technology for transparent, responsive and accountable cities.</p></div><div className="footer-links"><span>Privacy</span><span>Accessibility</span><span>Help Center</span><span>Terms</span></div><small>© {new Date().getFullYear()} CiviX. All rights reserved.</small></footer>;}

function Header({ theme, setTheme, go, user, unread, onLogout, searchQuery, onSearch }: { theme:string; setTheme:(v:string)=>void; go:(s:Screen)=>void; user:User|null; unread:number; onLogout:()=>void; searchQuery:string; onSearch:(q:string)=>void }) {
  return <header className="topbar">
    <div className="mobile-logo"><Logo/></div>
    <div className="search"><Icon name="search" size={18}/><input value={searchQuery} placeholder="Search grievances, locations..." onChange={e=>onSearch(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){const q=searchQuery.trim();if(q){localStorage.setItem("civix_search",q);go("feed");}}}}/>{searchQuery&&<button type="button" className="search-clear" aria-label="Clear search" onClick={()=>onSearch("")}>×</button>}</div>
    <div className="top-actions">
      <button className="icon-btn" onClick={()=>setTheme(theme==="dark"?"light":"dark")} aria-label="Toggle theme"><Icon name={theme==="dark"?"sun":"moon"}/></button>
      <button className="icon-btn notification-dot" onClick={()=>go("notifications")} aria-label={`Notifications${unread?` (${unread})`:""}`}><Icon name="bell"/>{unread>0&&<span className="notification-count">{unread>99?"99+":unread}</span>}</button>
      <button className="user-chip" onClick={()=>go("profile")}><Avatar initials={user?.name?getInitials(user.name):"?"} src={user?.profileImage} useDefault small/><span><b>{user?.name||"Account"}</b><small>{user?.role||"citizen"}</small></span></button>
      <button className="mobile-logout" onClick={onLogout} aria-label="Log out"><Icon name="logout"/></button>
    </div>
  </header>;
}

function downloadJson(filename:string,data:unknown){const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=filename;a.click();URL.revokeObjectURL(url);}

function getInitials(name:string){return name.trim().split(/\s+/).slice(0,2).map(x=>x[0]).join("").toUpperCase()||"?";}

function publicSummary(grievance: Grievance){
  const normalize=(value:string)=>value.toLowerCase().replace(/\s+/g," ").trim().replace(/[.!?]+$/g,"");
  const raw=(grievance.summary||"").trim();
  const title=(grievance.title||grievance.text||"").trim();
  if(raw && normalize(raw)!==normalize(title) && normalize(raw)!==normalize(grievance.text||"")) return raw;
  const category=(grievance.category||"civic").replace(/_/g," ").toLowerCase();
  return `Reported ${category} issue requiring attention from the responsible department.`;
}

const citizenNav = [
  { label: "Home", icon: "home", screen: "home" as Screen },
  { label: "Emergency", icon: "shield", screen: "emergency" as Screen },
  { label: "Civic Feed", icon: "feed", screen: "feed" as Screen },
  { label: "Nearby", icon: "map", screen: "nearby" as Screen },
  { label: "My Grievances", icon: "report", screen: "grievances" as Screen },
  { label: "Civic Impact", icon: "chart", screen: "impact" as Screen },
  { label: "Notifications", icon: "bell", screen: "notifications" as Screen },
  { label: "Profile", icon: "user", screen: "profile" as Screen },
];

function Sidebar({ role, actualRole, screen, go, onLogout, onWorkspace }: { role: Role; actualRole: Role; screen: Screen; go: (s: Screen) => void; onLogout: () => void; onWorkspace?: (role: Role) => void }) {
  const officer = [
    ["Emergency Response", "shield", "emergency"],
    ["Dashboard", "dashboard", "dashboard"], ["Acknowledge", "check", "acknowledge"], ["Grievances", "feed", "incidents"], ["Priority Queue", "clock", "incidents"], ["GIS Map", "map", "map"], ["SLA Monitor", "chart", "sla"], ["Resolved", "check", "resolved"], ["Profile", "user", "profile"],
  ] as [string, string, Screen][];
  const admin = [
    ["Emergency Response", "shield", "emergency"],
    ["Dashboard", "dashboard", "dashboard"], ["Users & Officers", "users", "users"], ["Departments", "shield", "departments"], ["AI Review", "settings", "ai-review"], ["Moderation", "feed", "moderation"], ["Analytics", "chart", "analytics"], ["Audit Logs", "clock", "audit"], ["System Overview", "settings", "system-overview"], ["SLA Configuration", "clock", "sla-config"], ["Profile", "user", "profile"],
  ] as [string, string, Screen][];
  const items = role === "citizen" ? citizenNav.map(x => [x.label, x.icon, x.screen] as [string,string,Screen]) : role === "officer" ? officer : admin;
  return (
    <aside className="sidebar">
      <Logo inverse/>
      <div className="role-label">{role === "citizen" ? "Citizen space" : role === "officer" ? "Officer operations" : "System administration"}</div>
      <nav>{items.map(([label, icon, target]) => <button key={label} className={`${screen === target || (target === "impact" && screen === "impact") ? "active" : ""} ${target === "emergency" ? "emergency-nav-item" : ""}`} onClick={() => go(target)}><Icon name={icon}/><span>{label}</span></button>)}</nav>
      {role === "citizen" && <Button variant="accent" icon="report" onClick={() => go("report")}>Report an Issue</Button>}
      <div className="sidebar-bottom">
        <button type="button" className="sidebar-help" onClick={()=>window.dispatchEvent(new Event("civix-open-support"))} aria-label="Open CiviX AI support"><Icon name="shield"/><div><b>CiviX help desk</b><small>Support available 24/7</small></div></button>
        <button className="logout-button" onClick={onLogout}><Icon name="logout"/><span>Log out</span></button>
      </div>
    </aside>
  );
}

function BottomNav({ screen, go }: { screen: Screen; go: (s: Screen) => void }) {
  const items = [citizenNav[0], citizenNav[1], { label: "Report", icon: "report", screen: "report" as Screen }, citizenNav[4], citizenNav[5], { label: "Emergency", icon: "shield", screen: "emergency" as Screen }];
  return <nav className="bottom-nav">{items.map(x => <button key={x.label} onClick={() => go(x.screen)} className={`${screen === x.screen ? "active" : ""} ${x.label === "Report" ? "report-nav" : ""} ${x.screen === "emergency" ? "emergency-bottom-nav" : ""}`}><span><Icon name={x.icon}/></span><small>{x.label}</small></button>)}</nav>;
}

function SupportAssistant({ role }: { role: Role }) {
  const [open,setOpen]=useState(false);
  const [message,setMessage]=useState("");
  const [typing,setTyping]=useState(false);
  const [messages,setMessages]=useState<{sender:"ai"|"user";text:string}[]>([{sender:"ai",text:`CiviX Assistant is connected to your ${role} workspace. Ask about your grievances, nearby civic issues, departments, officers or live civic data.`}]);
  useEffect(()=>{const openSupport=()=>setOpen(true);window.addEventListener("civix-open-support",openSupport);return()=>window.removeEventListener("civix-open-support",openSupport)},[]);
  const prompts=role==="citizen"?["What are my nearby civic grievances?","Track my grievance","Which department has my grievance?","Help me report an issue"]:role==="officer"?["Show my SLA risks","Show my assigned grievances","What nearby issues need attention?","Resolution checklist"]:["Explain AI queue","Show unresolved grievances","What issues are nearby?","Summarize city performance"];
  const sendMessage=async(text:string)=>{
    const clean=text.trim(); if(!clean)return;
    setMessages(x=>[...x,{sender:"user",text:clean}]); setMessage(""); setTyping(true);
    try {
      const needsLocation=/\bnearby\b|near me|around me|close to me|near me|in my area|near my location/i.test(clean);
      let location: {latitude:number;longitude:number}|undefined;
      if(needsLocation && navigator.geolocation){
        location=await new Promise<{latitude:number;longitude:number}|undefined>(resolve=>navigator.geolocation.getCurrentPosition(
          p=>resolve({latitude:p.coords.latitude,longitude:p.coords.longitude}),
          ()=>resolve(undefined),
          {enableHighAccuracy:true,timeout:7000,maximumAge:15000}
        ));
      }
      const r=await api.assistant.ask(clean, location);
      setMessages(x=>[...x,{sender:"ai",text:r.response}]);
    } catch(e) {
      setMessages(x=>[...x,{sender:"ai",text:e instanceof Error?e.message:"Assistant unavailable"}]);
    } finally { setTyping(false); }
  };
  return <>{open&&<section className="support-panel" aria-label="CiviX AI support assistant"><header><span className="support-ai-icon"><Icon name="settings"/></span><div><b>CiviX Assistant</b><small><i/> Live data assistant</small></div><button onClick={()=>setOpen(false)} aria-label="Close support assistant">×</button></header><div className="support-messages">{messages.map((item,index)=><div className={`support-message ${item.sender}`} key={`${item.sender}-${index}`}>{item.sender==="ai"&&<span><Icon name="settings" size={14}/></span>}<p>{item.text}</p></div>)}{typing&&<div className="support-message ai"><span><Icon name="settings" size={14}/></span><div className="typing-dots"><i/><i/><i/></div></div>}</div><div className="support-prompts">{prompts.map(prompt=><button key={prompt} onClick={()=>sendMessage(prompt)}>{prompt}</button>)}</div><form className="support-input" onSubmit={e=>{e.preventDefault();sendMessage(message)}}><input value={message} onChange={e=>setMessage(e.target.value)} placeholder="Ask CiviX anything…"/><button type="submit" aria-label="Send message"><Icon name="arrow" size={18}/></button></form><small className="support-disclaimer"><Icon name="shield" size={12}/> Answers are generated from current CiviX data.</small></section>}<button className={`support-button ${open?"active":""}`} onClick={()=>setOpen(!open)} aria-expanded={open} aria-label={open?"Close AI support":"Talk to CiviX AI support"}><span><Icon name={open?"check":"comment"} size={21}/></span><b>{open?"Close":"AI Support"}</b><i/></button></>;
}

function Landing({ go, theme, setTheme }: { go: (s: Screen) => void; theme: string; setTheme: (value: string) => void }) {
  const [stats,setStats]=useState<any>(null);
  const [featured,setFeatured]=useState<Grievance|null>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  useEffect(() => { api.public.stats().then(setStats).catch(()=>{}); api.public.map(new URLSearchParams({limit:"1"})).then(items=>setFeatured(items[0]||null)).catch(()=>{}); }, []);

  useEffect(() => {
    const sections = document.querySelectorAll(".landing .scroll-reveal");
    const observer = new IntersectionObserver(
      entries => entries.forEach(entry => {
        if (entry.isIntersecting) entry.target.classList.add("is-visible");
      }),
      { threshold: 0.16 },
    );
    sections.forEach(section => observer.observe(section));

    const updateProgress = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const progress = scrollable > 0 ? Math.min(window.scrollY / scrollable, 1) : 0;
      if (progressRef.current) progressRef.current.style.transform = `scaleX(${progress})`;
    };
    updateProgress();
    window.addEventListener("scroll", updateProgress, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", updateProgress);
    };
  }, []);

  return (
    <div className="landing">
      <div className="scroll-progress" ref={progressRef}/>
      <nav className="landing-nav"><Logo/><div className="landing-links"><button onClick={() => document.getElementById("how")?.scrollIntoView({behavior:"smooth"})}>How it works</button><button onClick={() => go("feed")}>Civic feed</button><button className="landing-theme-toggle" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`} title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}><Icon name={theme === "dark" ? "sun" : "moon"} size={19}/><span>{theme === "dark" ? "Light" : "Dark"}</span></button><button onClick={() => go("login")}>Sign in</button><Button variant="accent" onClick={() => go("report")}>Report an Issue</Button></div></nav>
      <main>
        <section className="hero">
          <div className="hero-copy">
            <Status tone="sky"><Icon name="shield" size={15}/> Built for people. Accountable by design.</Status>
            <h1>Connect.<br/>Report. <em>Resolve.</em></h1>
            <p>Make your city better, one report at a time. CiviX connects your voice to the people who can act.</p>
            <div className="hero-actions"><Button variant="accent" icon="report" onClick={() => go("report")}>Report an Issue</Button><Button variant="secondary" icon="feed" onClick={() => go("feed")}>Explore Civic Feed</Button><Button variant="primary" icon="user" onClick={() => go("login")}>Log in</Button></div>
            <div className="trust-row"><div><b>{stats?.resolved ?? "—"}</b><span>Issues resolved</span></div><div><b>{stats?.satisfaction != null ? `${stats.satisfaction}%` : stats?.resolutionRate != null ? `${stats.resolutionRate}%` : "—"}</b><span>{stats?.satisfaction != null ? "Citizen satisfaction" : "Resolution rate"}</span></div><div><b>{stats?.averageResponseHours != null ? `${stats.averageResponseHours}h` : "—"}</b><span>Avg. response</span></div></div>
            <button className="scroll-cue" onClick={() => document.getElementById("how")?.scrollIntoView({behavior:"smooth"})}><span>Scroll to explore</span><i><Icon name="arrow" size={15}/></i></button>
          </div>
          <div className="hero-visual">
            <CityMap publicOnly/>
            {featured && <Card className="float-card issue-float"><div className="mini-row"><span className="issue-icon"><Icon name="pin"/></span><div><Status tone={featured.severity === "critical" ? "red" : "orange"}>{featured.severity || "Reported"}</Status><b>{(featured.title||featured.text)?.slice(0,55) || featured.grievanceId}</b><small><Icon name="clock" size={13}/> {featured.status?.replace(/_/g," ") || "Reported"}</small></div></div></Card>}
          </div>
        </section>
        <section className="how scroll-reveal" id="how"><div className="section-heading"><Status tone="sky">A clear path to action</Status><h2>From a local issue to a visible resolution</h2><p>Every report follows a transparent, accountable path.</p></div><div className="steps">{[["01","Report","Add details, evidence and location in minutes."],["02","AI analysis","CiviX detects impact and routes intelligently."],["03","Government action","The right team acknowledges and gets to work."],["04","Resolution","See verified before-and-after evidence."]].map((x,i)=><div className="step" key={x[0]}><span>{x[0]}</span><div className="step-icon"><Icon name={i===0?"camera":i===1?"settings":i===2?"users":"check"}/></div><h3>{x[1]}</h3><p>{x[2]}</p></div>)}</div></section>
        <section className="feature-split scroll-reveal"><div className="feature-photo"><img src={civicPhoto} alt="A busy Indian city street"/><div className="photo-badge"><Icon name="vote"/><b>Community reports become visible civic action</b></div></div><div className="feature-copy"><Status tone="orange">Citizen power</Status><h2>One voice starts it.<br/>A community moves it.</h2><p>Discover what matters nearby, support urgent issues, and follow every action from first report to verified resolution.</p>{["Vote on civic priorities","Join constructive local discussions","Get progress updates that matter"].map(x=><div className="check-line" key={x}><span><Icon name="check" size={16}/></span>{x}</div>)}<Button variant="secondary" onClick={() => go("feed")}>Visit the civic feed <Icon name="arrow" size={17}/></Button></div></section>
        <section className="intelligence scroll-reveal"><div className="intelligence-scan"/><div className="section-heading"><Status tone="sky">Human-guided intelligence</Status><h2>Faster routing. Smarter action.</h2><p>AI assists public teams while people remain in control.</p></div><div className="intel-grid">{[["Category detection","AI-assisted classification","Live"],["Severity","Risk assessment","Live"],["Duplicate detection","Similarity analysis","Live"],["Department routing","Location-aware routing","Live"]].map((x,i)=><Card key={x[0]}><span className="intel-icon"><Icon name={i===2?"feed":i===3?"map":"settings"}/></span><small>{x[0]}</small><b>{x[1]}</b><em>{x[2]}</em><i className="intel-live-bar"/></Card>)}</div></section>
        <section className="final-cta scroll-reveal">
          <div className="cta-flow" aria-label="CiviX resolution process">
            {[
              ["camera", "Report", "Share the issue"],
              ["settings", "Analyze", "Route intelligently"],
              ["users", "Act", "Government responds"],
              ["check", "Resolve", "Evidence verified"],
            ].map((item, index) => (
              <div className="cta-flow-step" key={item[1]}>
                <div className="cta-flow-node">
                  <span><Icon name={item[0]} size={22}/></span>
                  <div><b>{item[1]}</b><small>{item[2]}</small></div>
                </div>
                {index < 3 && <span className="cta-flow-arrow"><Icon name="arrow" size={20}/></span>}
              </div>
            ))}
          </div>
          <h2>Your city. Your voice.</h2><p>Report what matters. Follow the action. See the change.</p><Button variant="accent" onClick={() => go("report")}>Make your first report <Icon name="arrow" size={18}/></Button>
        </section>
      </main>
      <Footer/>
    </div>
  );
}

function Auth({
  screen,
  go,
  onAuthenticated,
}: {
  screen: Screen;
  go: (s: Screen) => void;
  onAuthenticated: () => void;
}) {
  const title: Record<string, string> = {
    login: "Welcome back",
    register: "Create your account",
    "verify-email": "Verify your email",
    "email-sent": "Check your email",
    forgot: "Forgot password?",
    reset: "Set a new password",
    "reset-success": "Password reset",
  };

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [loginMode, setLoginMode] = useState<"citizen" | "government">("citizen");
  const [error, setError] = useState("");
  const googleButtonRef = useRef<HTMLDivElement | null>(null);

  const handleGoogleCredential = async (credential: string) => {
    setError("");
    try {
      setGoogleLoading(true);
      const data = await api.auth.googleLogin(credential);
      localStorage.setItem("civix_token", data.token);
      localStorage.setItem("civix_user", JSON.stringify(data.user));
      onAuthenticated();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Google sign-in failed. Please try again.");
    } finally {
      setGoogleLoading(false);
    }
  };

  useEffect(() => {
    if (screen !== "login" && screen !== "register") return;

    let cancelled = false;

    if (!GOOGLE_CLIENT_ID) {
      return () => { cancelled = true; };
    }

    loadGoogleIdentityScript()
      .then(() => {
        if (cancelled || !googleButtonRef.current || !window.google?.accounts?.id) return;

        googleButtonRef.current.innerHTML = "";
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: ({ credential }) => {
            void handleGoogleCredential(credential);
          },
        });

        window.google.accounts.id.renderButton(googleButtonRef.current, {
          theme: "outline",
          size: "large",
          width: 360,
          text: "continue_with",
          shape: "rectangular",
          logo_alignment: "left",
        });
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Google Sign-In could not load.");
      });

    return () => {
      cancelled = true;
      if (googleButtonRef.current) googleButtonRef.current.innerHTML = "";
    };
  }, [screen, loginMode]);

  const resetToken = new URLSearchParams(window.location.search).get("token") || "";
  const resetEmail = new URLSearchParams(window.location.search).get("email") || email;

  const submit = async (event?: FormEvent) => {
    event?.preventDefault();
    setError("");

    try {
      setLoading(true);

      if (screen === "register") {
        if (!fullName.trim() || !username.trim() || !email.trim() || password.length < 8) {
          setError("Please complete all fields. Password must be at least 8 characters.");
          return;
        }

        await api.auth.register({
          name: fullName.trim(),
          username: username.trim(),
          email: email.trim(),
          password,
        });

        go("verify-email");
        return;
      }

      if (screen === "login") {
        if (!email.trim() || !password) {
          setError(loginMode === "government" ? "Enter your Government ID and password." : "Enter your email and password.");
          return;
        }

        const data = await api.auth.login(email.trim(), password);
        localStorage.setItem("civix_token", data.token);
        localStorage.setItem("civix_user", JSON.stringify(data.user));
        onAuthenticated();
        return;
      }

      if (screen === "forgot") {
        if (!email.trim()) {
          setError("Enter your email address.");
          return;
        }

        await api.auth.forgotPassword(email.trim());
        go("email-sent");
        return;
      }

      if (screen === "reset") {
        if (!resetToken || !resetEmail) {
          setError("This password reset link is invalid. Please request a new one.");
          return;
        }

        if (password.length < 8) {
          setError("Password must be at least 8 characters.");
          return;
        }

        if (password !== confirmPassword) {
          setError("Passwords do not match.");
          return;
        }

        await api.auth.resetPassword(resetEmail, resetToken, password);
        go("reset-success");
        return;
      }

      if (screen === "email-sent") {
        go("login");
        return;
      }

      if (screen === "verify-email") {
        if (!email.trim()) {
          setError("Enter the email address you registered with.");
          return;
        }

        await api.auth.resendVerification(email.trim());
        setError("A new verification email has been sent.");
        return;
      }

      if (screen === "reset-success") {
        go("login");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    <div className="auth">
      <section className="auth-brand">
        <Logo inverse tagline />
        <div>
          <Status tone="sky">Your city, connected</Status>
          <h1>A better city starts with being heard.</h1>
          <p>Report issues, see real action and build a more accountable city—together.</p>
        </div>
        <CityMap compact publicOnly />
        <small>Trusted civic infrastructure for everyone.</small>
      </section>

      <section className="auth-panel">
        <button className="back-link" onClick={() => go("landing")}>← Back to CiviX</button>
        <div className="auth-mobile-logo"><Logo tagline /></div>

        <form onSubmit={submit}>
          <div className="auth-heading">
            {(screen === "reset-success" || screen === "email-sent") && (
              <div className="success-icon"><Icon name="check" size={28} /></div>
            )}
            <h2>{title[screen]}</h2>
            <p>
              {screen === "verify-email"
                ? `We sent a verification link to ${email}. Open it to activate your account.`
                : screen === "email-sent"
                ? "If an account exists, we sent instructions to your email. Check your inbox and spam folder."
                : screen === "reset-success"
                ? "Your password has been updated successfully."
                : screen === "forgot"
                ? "Enter your email and we’ll send you a secure password reset link."
                : screen === "register"
                ? "Join people improving their city every day."
                : screen === "reset"
                ? "Choose a new password for your CiviX account."
                : "Sign in to continue making a difference."}
            </p>
          </div>

          {screen === "register" && (
            <>
              <Field label="Full name" placeholder="Your full name" value={fullName} onChange={setFullName} />
              <Field label="Username" placeholder="aaravk" value={username} onChange={setUsername} />
              <Field label="Email address" placeholder="you@example.com" type="email" value={email} onChange={setEmail} />
            </>
          )}

          {screen === "login" && (
            <>
              <div className="login-mode-switch" role="tablist" aria-label="Login type">
                <button type="button" className={loginMode === "citizen" ? "active" : ""} onClick={() => {setLoginMode("citizen");setEmail("");setError("")}}>Citizen</button>
                <button type="button" className={loginMode === "government" ? "active" : ""} onClick={() => {setLoginMode("government");setEmail("");setError("")}}>Government</button>
              </div>
              <Field label={loginMode === "government" ? "Government ID" : "Email address"} placeholder={loginMode === "government" ? "CIVIX-OFFICER-001" : "you@example.com"} type={loginMode === "government" ? "text" : "email"} value={email} onChange={setEmail} />
              {loginMode === "government" && <small className="gov-login-help">Use the Government ID and password issued by an administrator. For seeded local development accounts, run <b>npm run seed</b> in the backend first.</small>}
            </>
          )}

          {screen === "forgot" && (
            <Field label="Email address" placeholder="you@example.com" type="email" value={email} onChange={setEmail} />
          )}

          {screen === "verify-email" && (
            <Field label="Email address" placeholder="you@example.com" type="email" value={email} onChange={setEmail} />
          )}

          {(screen === "login" || screen === "register" || screen === "reset") && (
            <Field label={screen === "reset" ? "New password" : "Password"} placeholder="At least 8 characters" type="password" value={password} onChange={setPassword} />
          )}

          {screen === "reset" && (
            <Field label="Confirm password" placeholder="Repeat new password" type="password" value={confirmPassword} onChange={setConfirmPassword} />
          )}

          {error && (
            <p style={{ color: error.includes("sent") ? "#15803d" : "#dc2626", marginTop: "10px", fontSize: "14px" }}>
              {error}
            </p>
          )}

          {screen === "login" && (
            <div className="form-meta">
              <label><input type="checkbox" /> Remember me</label>
              <button type="button" onClick={() => go("forgot")}>Forgot password?</button>
            </div>
          )}

          {screen === "verify-email" && (
            <button type="button" className="back-link" onClick={() => go("login")} style={{ marginTop: "14px" }}>
              Already verified? Sign in
            </button>
          )}

          <Button type="submit" disabled={loading || googleLoading}>
            {loading
              ? "Please wait..."
              : screen === "login"
              ? "Sign in"
              : screen === "register"
              ? "Create Account"
              : screen === "verify-email"
              ? "Resend verification email"
              : screen === "email-sent"
              ? "Return to sign in"
              : screen === "reset-success"
              ? "Return to sign in"
              : screen === "forgot"
              ? "Send reset link"
              : "Update password"}
            <Icon name="arrow" size={17} />
          </Button>

          {(screen === "login" || screen === "register") && loginMode === "citizen" && GOOGLE_CLIENT_ID && (
            <div className="google-auth">
              <div className="auth-divider"><span>OR</span></div>
              <div className={`google-button-wrap ${googleLoading ? "is-loading" : ""}`} ref={googleButtonRef} aria-label="Continue with Google">
                {googleLoading && <span className="google-loading">Signing in with Google…</span>}
              </div>
              <small className="google-account-note">
                {screen === "login"
                  ? "Use your Google account to sign in to your existing CiviX account."
                  : "Google will create your CiviX account using your verified profile."}
              </small>
            </div>
          )}

          {(screen === "login" || screen === "register") && (
            <p className="auth-switch">
              {screen === "login" ? "New to CiviX?" : "Already have an account?"}
              <button type="button" onClick={() => go(screen === "login" ? "register" : "login")}>
                {screen === "login" ? "Create an account" : "Sign in"}
              </button>
            </p>
          )}
        </form>
      </section>
    </div>
    <Footer compact />
    </>
  );
}

function IssueCard({ go, resolved = false, compact = false, grievance }: { go:(s:Screen)=>void; resolved?:boolean; compact?:boolean; grievance?:Grievance }) {
  const id=grievance?.grievanceId;
  const title=grievance?.title || grievance?.text || "Civic issue";
  const summary=grievance ? publicSummary(grievance) : "";
  const category=grievance?.category?.replace(/_/g," ").toUpperCase();
  const status=grievance?.status;
  const impact=grievance?.impactScore ?? 0;
  const [upvotes,setUpvotes]=useState(grievance?.upvoteCount ?? 0);
  const [downvotes,setDownvotes]=useState(grievance?.downvoteCount ?? 0);
  const [myVote,setMyVote]=useState<"upvote"|"downvote"|null>(grievance?.myVote ?? null);
  const [voting,setVoting]=useState(false);
  const comments=grievance?.commentCount ?? 0;
  const isResolved=status==="RESOLVED";
  const image=grievance?.media?.find(m=>m.type==="image")?.url;
  if(!grievance) return <Card className={`issue-card ${compact?"compact-issue":""}`}><div className="empty-state"><b>No civic issue available yet</b><small>Live reports from the backend will appear here.</small></div></Card>;
  const open=()=>{localStorage.setItem("civix_selected_grievance",String(grievance._id||grievance.grievanceId));go("detail");};
  const vote=async(type:"upvote"|"downvote")=>{
    if(!grievance.postId || voting)return;
    setVoting(true);
    try{
      if(myVote===type){
        const result=await api.votes.remove(grievance.postId);
        setUpvotes(result.upvotes ?? upvotes);
        setDownvotes(result.downvotes ?? downvotes);
        setMyVote(null);
      }else{
        const result=await api.votes.vote(grievance.postId,type);
        setUpvotes(result.upvotes ?? upvotes);
        setDownvotes(result.downvotes ?? downvotes);
        setMyVote(type);
      }
    }catch{}finally{setVoting(false)}
  };
  return <Card className={`issue-card ${compact?"compact-issue":""}`} onClick={open}>
    <div className="issue-card-top"><div className="dept-icon"><Icon name={isResolved?"check":"pin"}/></div><div><div className="eyebrow">{id} · {category||"UNCATEGORIZED"}</div><h3>{title.slice(0,100)}</h3><p><Icon name="pin" size={14}/> {isResolved?"Resolved incident":"Civic issue"} · {grievance.createdAt?new Date(grievance.createdAt).toLocaleString():""}</p></div><>{grievance.acknowledgedAt && !isResolved && <Status tone="green">✓ Acknowledged</Status>}<Status tone={isResolved?"green":status==="REJECTED"?"red":"blue"}>{isResolved?"✓ Resolved":(status||"SUBMITTED").replace(/_/g," ")}</Status></></div>
    {!compact && <>{image?<div className="issue-image"><img src={image} alt="Civic issue evidence"/><span><Icon name="camera" size={15}/> {grievance.media?.length||0} evidence items</span></div>:null}<p className="issue-description">{summary}</p></>}
    <div className="engagement"><button className={myVote==="upvote"?"active-vote":""} disabled={voting} onClick={e=>{e.stopPropagation();vote("upvote")}}><Icon name="vote" size={17}/> <b>{upvotes}</b></button><button className={`downvote ${myVote==="downvote"?"active-vote":""}`} disabled={voting} onClick={e=>{e.stopPropagation();vote("downvote")}}><Icon name="vote" size={17}/> {downvotes}</button><button onClick={e=>{e.stopPropagation();open();}}><Icon name="comment" size={17}/> {comments}</button><span>Coverage {grievance.engagementScore ?? (upvotes+downvotes+comments)}</span></div>
  </Card>;
}

function Home({ go, location, user }: { go:(s:Screen)=>void; location:LocationState; user:User }) {
  const [nearby,setNearby]=useState<Grievance[]>([]); const [mine,setMine]=useState<Grievance[]>([]); const [loading,setLoading]=useState(true);
  const [civicBadge,setCivicBadge]=useState<any>(null);
  useEffect(()=>{api.gamification.me().then((profile:any)=>setCivicBadge(profile.currentBadge || profile.badges?.[0] || null)).catch(()=>setCivicBadge(null));},[]);
  useEffect(()=>{if(!location){setNearby([]);setLoading(false);api.grievances.list(new URLSearchParams({mine:"true",page:"1",limit:"5"})).then(b=>setMine(b.items));return;} const p=new URLSearchParams({page:"1",limit:"6",type:"nearby"}); if(location){p.set("lat",String(location.latitude));p.set("lng",String(location.longitude));p.set("radius","5000");} Promise.all([api.feed(p),api.grievances.list(new URLSearchParams({mine:"true",page:"1",limit:"5"}))]).then(([a,b])=>{setNearby(a.items);setMine(b.items)}).finally(()=>setLoading(false));},[location?.latitude,location?.longitude]);
  const latest=mine[0]; const active=nearby.filter(x=>x.status!=="RESOLVED"&&x.status!=="REJECTED");
  const greetingHour = new Date().getHours();
  const greeting = greetingHour < 12 ? "Good morning" : greetingHour < 17 ? "Good afternoon" : greetingHour < 21 ? "Good evening" : "Good night";
  return <div className="page"><section className="welcome"><div><span>{new Date().toLocaleDateString(undefined,{weekday:"long",day:"numeric",month:"long"}).toUpperCase()}</span><h1>{greeting}, {user.name.split(" ")[0]}.</h1><p>Here’s what’s happening around your current location today.</p></div><Button variant="accent" icon="report" onClick={()=>go("report")}>Report an Issue</Button></section>{user.role==="citizen"&&<section className="home-current-badge" aria-label="Your current civic badge"><div className="home-badge-mark">{getBadgeImage(civicBadge)?<img className="home-badge-image" src={getBadgeImage(civicBadge)} alt={`${civicBadge?.name||"Civic"} badge`} />:<Icon name={civicBadge?.icon||"badge-check"} size={23}/>}</div><div className="home-badge-copy"><span className="eyebrow">YOUR CURRENT BADGE</span><h3>{civicBadge?.name||"Newbie"}</h3><p>{civicBadge?.description||"Your CiviX journey starts here. Resolve your first verified report to earn the next badge."}</p></div><button className="home-badge-link" onClick={()=>go("profile")}>View civic impact <Icon name="arrow" size={15}/></button></section>}<div className="home-grid"><main>{latest&&<div className="quick-status"><div><span className="pulse"/><div><b>Your latest report is {latest.status.replace(/_/g," ").toLowerCase()}</b><p>{latest.grievanceId} · {latest.departments?.join(", ")||"Awaiting routing"}</p></div></div><Button variant="ghost" onClick={()=>{localStorage.setItem("civix_selected_grievance",String(latest._id||latest.grievanceId));go("detail")}}>Track progress <Icon name="arrow" size={16}/></Button></div>}<div className="section-row"><div><h2>Nearby civic issues</h2><p>{location?`Within 5 km of your live location`:`Enable location to see nearby reports`}</p></div><button onClick={()=>go("feed")}>View all <Icon name="arrow" size={15}/></button></div>{loading?<Card><div className="empty-state">Loading live reports…</div></Card>:active.slice(0,2).map(g=><IssueCard key={g.grievanceId} go={go} grievance={g}/>)}</main><aside className="right-panel"><Card className="map-card"><div className="card-title"><div><h3>Your neighborhood</h3><p>{active.length} active reports loaded</p></div><button onClick={()=>go("nearby")}><Icon name="arrow"/></button></div><CityMap compact location={location} onMarker={id=>{if(id)localStorage.setItem("civix_selected_grievance",id);go("detail")}}/></Card><Card><div className="card-title"><div><h3>Community pulse</h3><p>Live from current civic data</p></div></div><div className="stat-list"><span>Nearby active issues <b>{active.length}</b></span><span>Your reports <b>{mine.length}</b></span><span>Resolved nearby <b>{nearby.filter(x=>x.status==="RESOLVED").length}</b></span></div></Card></aside></div></div>;
}

function Feed({ go, nearby=false, location, searchQuery }: { go:(s:Screen)=>void; nearby?:boolean; location:LocationState; searchQuery:string }) {
  const [items,setItems]=useState<Grievance[]>([]);
  const [loading,setLoading]=useState(true);
  const [tab,setTab]=useState(nearby?"Nearby":"For You");
  const [department,setDepartment]=useState("");
  const departments=[
    ["pwd","Road Department"],["water_board","Water Department"],["sanitation","Sanitation Department"],
    ["electricity_board","Electrical Department"],["sewerage","Sewerage Department"],["traffic_police","Traffic Department"],
    ["police","Public Safety"],["health","Healthcare Department"],["other","Other Services"]
  ] as const;

  useEffect(()=>{
    if((nearby||tab==="Nearby")&&!location){setItems([]);setLoading(false);return;}

    let cancelled=false;
    let firstLoad=true;
    const loadFeed=async()=>{
      if(firstLoad && items.length===0)setLoading(true);
      const p=new URLSearchParams({page:"1",limit:"50"});
      if(tab==="Resolved")p.set("status","RESOLVED");
      if(nearby||tab==="Nearby"){
        p.set("type","nearby");
        if(location){p.set("lat",String(location.latitude));p.set("lng",String(location.longitude));p.set("radius","5000");}
      }
      if(tab==="Department"&&department)p.set("department",department);
      const q=searchQuery.trim();
      if(q)p.set("search",q);
      try{
        const r=await api.feed(p);
        if(!cancelled)setItems(r.items);
      }catch{
        if(!cancelled && firstLoad)setItems([]);
      }finally{
        if(!cancelled)setLoading(false);
        firstLoad=false;
      }
    };

    loadFeed();
    // Refresh quietly in the background. Existing cards remain visible while fresh data arrives.
    const timer=window.setInterval(loadFeed,30000);
    return()=>{cancelled=true;window.clearInterval(timer)};
  },[nearby,tab,department,location?.latitude,location?.longitude,searchQuery]);

  const tabs=["Nearby","For You","Department","Resolved"];
  return <div className="page narrow-page">
    <div className="page-heading"><div><span className="eyebrow">{nearby?"LIVE MAP":"PUBLIC CIVIC FEED"}</span><h1>{nearby?"Issues near you":"Your city, in focus"}</h1><p>{location?"Live reports loaded from CiviX backend.":"Live public reports. Enable location for nearby results."}</p></div><Button variant="accent" icon="report" onClick={()=>go("report")}>Report</Button></div>
    {nearby&&<Card className="large-map"><CityMap location={location} onMarker={id=>{if(id)localStorage.setItem("civix_selected_grievance",id);go("detail")}}/></Card>}
    <div className="feed-layout"><main>
      <div className="tabs">{tabs.map(x=><button className={tab===x?"active":""} onClick={()=>{setTab(x);if(x!=="Department")setDepartment("")}} key={x}>{x}</button>)}</div>
      {tab==="Department"&&<label className="field department-filter"><span>Department</span><select value={department} onChange={e=>setDepartment(e.target.value)}><option value="">All departments</option>{departments.map(([code,name])=><option key={code} value={code}>{name}</option>)}</select></label>}
      {loading?<Card><div className="empty-state">Loading live feed…</div></Card>:items.length?items.map(item=><IssueCard key={item.grievanceId} go={go} grievance={item} resolved={item.status==="RESOLVED"}/>):<Card><div className="empty-state"><b>No reports found</b><small>Try another department or report the first issue.</small></div></Card>}
    </main><aside className="feed-side"><Card className="civic-note"><Icon name="shield"/><h3>Keep it constructive</h3><p>Focus on the issue, protect personal information and help others participate safely.</p></Card></aside></div>
  </div>;
}

function Detail({ go }: { go:(s:Screen)=>void }) {
  const [grievance,setGrievance]=useState<Grievance|null>(null); const [comments,setComments]=useState<any[]>([]); const [comment,setComment]=useState(""); const [postId,setPostId]=useState(""); const [myVote,setMyVote]=useState<"upvote"|"downvote"|null>(null); const [supportCount,setSupportCount]=useState(0); const [supporting,setSupporting]=useState(false); const [loading,setLoading]=useState(true); const [message,setMessage]=useState("");
  const [whatsappEnabled,setWhatsappEnabled]=useState(false); const [whatsappNumber,setWhatsappNumber]=useState(""); const [whatsappConsent,setWhatsappConsent]=useState(false); const [savingWhatsapp,setSavingWhatsapp]=useState(false);
  useEffect(()=>{const id=localStorage.getItem("civix_selected_grievance"); if(!id){setLoading(false);return;} api.grievances.get(id).then(async g=>{setGrievance(g); const directPostId=typeof g.postId==="string"?g.postId:""; if(directPostId){setPostId(directPostId);setSupportCount(Number(g.upvoteCount||0));api.votes.get(directPostId).then(v=>{setSupportCount(Number(v.upvotes||0));setMyVote(v.myVote||null)}).catch(()=>{});api.comments.list(directPostId).then(r=>setComments(r.items)).catch(()=>setComments([]));return;} const posts=await api.posts(new URLSearchParams({page:"1",limit:"100"})); const post=posts.items.find((x:any)=>String(x.grievanceId?._id||x.grievanceId)===String(g._id)); if(post?._id){const pid=String(post._id);setPostId(pid);setSupportCount(Number(post.upvoteCount||g.upvoteCount||0));setMyVote(post.myVote||null);api.votes.get(pid).then(v=>{setSupportCount(Number(v.upvotes||0));setMyVote(v.myVote||null)}).catch(()=>{});api.comments.list(pid).then(r=>setComments(r.items)).catch(()=>setComments([]));}}).catch(()=>setGrievance(null)).finally(()=>setLoading(false));},[]);
  if(loading)return <div className="page"><Card><div className="empty-state">Loading grievance…</div></Card></div>; if(!grievance)return <div className="page"><Card><div className="empty-state"><b>No grievance selected</b><Button onClick={()=>go("feed")}>Open civic feed</Button></div></Card></div>;
  const image=grievance.media?.find(m=>m.type==="image")?.url; const videos=grievance.media?.filter(m=>m.type==="video")||[]; const voices=grievance.media?.filter(m=>m.type==="voice")||[]; const author=typeof grievance.userId==='object'?grievance.userId:null; const officer=typeof grievance.officerId==='object'?grievance.officerId:null;
  const toggleSupport=async()=>{if(!postId||supporting)return;setSupporting(true);setMessage("");try{if(myVote==="upvote"){const r=await api.votes.remove(postId);setMyVote(null);setSupportCount(Number(r.upvotes||Math.max(0,supportCount-1)));}else{const r=await api.votes.vote(postId,"upvote");setMyVote("upvote");setSupportCount(Number(r.upvotes||supportCount+1));}}catch(e){setMessage(e instanceof Error?e.message:"Unable to update support.")}finally{setSupporting(false)}};
  const addComment=async()=>{ if(!comment.trim()||!grievance._id)return; setMessage(""); try{ if(!postId){setMessage("Comments are not available for this report yet.");return;} await api.comments.add(postId,comment.trim()); const refreshed=await api.comments.list(postId); setComments(refreshed.items); setComment("");setMessage("Comment added."); }catch(e){setMessage(e instanceof Error?e.message:"Unable to add comment.");}};
  const saveWhatsappPreference=async()=>{setMessage("");if(whatsappEnabled){if(!/^\d{10}$/.test(whatsappNumber.replace(/\D/g,""))){setMessage("Enter a valid 10-digit Indian WhatsApp number.");return;}if(!whatsappConsent){setMessage("Please consent to receive WhatsApp updates.");return;}}setSavingWhatsapp(true);try{await api.updateProfile({whatsappNotifications:{enabled:whatsappEnabled,phoneNumber:whatsappEnabled?`+91${whatsappNumber.replace(/\D/g,"")}`:"",consentAt:whatsappEnabled?new Date().toISOString():null},whatsappConsent:whatsappEnabled&&whatsappConsent});setMessage(whatsappEnabled?"WhatsApp notification preference saved.":"WhatsApp notifications disabled.");}catch(e){setMessage(e instanceof Error?e.message:"Unable to save WhatsApp preference. Please try again.");}finally{setSavingWhatsapp(false)}};
  return <div className="page detail-page"><button className="back-link" onClick={()=>go("feed")}>← Back to civic feed</button><div className="detail-head"><div><div className="detail-tags"><Status tone={grievance.severity==="critical"?"red":"orange"}>{grievance.severity||"Unrated"} severity</Status><Status tone="blue">{grievance.status.replace(/_/g," ")}</Status><span>{grievance.grievanceId}</span></div><h1>{(grievance.title||grievance.text).slice(0,120)}</h1><p><Icon name="pin" size={16}/> {grievance.location?.coordinates?.length===2?`${grievance.location.coordinates[1].toFixed(5)}, ${grievance.location.coordinates[0].toFixed(5)}`:"Location unavailable"} · Reported {grievance.createdAt?new Date(grievance.createdAt).toLocaleString():""}</p></div><div className="detail-actions"><Button variant="secondary" icon="share" onClick={()=>navigator.share?.({title:grievance.title||grievance.grievanceId,text:grievance.summary||grievance.text})}>Share</Button><Button variant={myVote==="upvote"?"accent":"primary"} icon="vote" disabled={!postId||supporting} onClick={toggleSupport}>{supporting?"Supporting…":`Support · ${supportCount}`}</Button></div></div><div className="detail-grid"><main>{(image||videos.length||voices.length)&&<Card className="evidence"><div className="public-evidence-grid">{image&&<img src={image} alt="Citizen evidence"/>}{videos.map((m,i)=><video key={i} src={m.url} controls/>)}{voices.map((m,i)=><audio key={i} src={m.url} controls/> )}</div><div className="evidence-caption"><Icon name="camera" size={14}/> <span>Citizen evidence · Public media</span></div></Card>}{grievance.resolutionEvidence?.afterUrl&&<Card className="resolution-evidence-card"><div className="card-title"><div><h3>Officer resolution evidence</h3><p>Photo submitted by the department after completing the work.</p></div><Status tone={grievance.resolutionEvidence.verified?"green":"blue"}>{grievance.resolutionEvidence.verified?"Submitted":"Pending verification"}</Status></div><a className="resolution-evidence-image-link" href={grievance.resolutionEvidence.afterUrl} target="_blank" rel="noreferrer"><img className="resolution-evidence-image" src={grievance.resolutionEvidence.afterUrl} alt="Officer-uploaded completed work evidence" loading="lazy"/></a>{grievance.resolutionEvidence.resolutionDescription&&<div className="resolution-evidence-description"><b>Department's resolution</b><p>{grievance.resolutionEvidence.resolutionDescription}</p></div>}<div className="evidence-caption"><Icon name="camera" size={14}/><span>Final work photo · Officer submitted</span></div></Card>}<Card><h3>About this issue</h3><p>{grievance.summary||grievance.text}</p><div className="facts"><div><span>Category</span><b>{grievance.category||"Pending AI"}</b></div><div><span>Department</span><b>{grievance.departments?.join(", ")||"Pending routing"}</b></div><div><span>Impact score</span><b>{grievance.impactScore??"—"} / 100</b></div><div><span>Reports merged</span><b>{grievance.masterIncidentId?"Linked":"None"}</b></div></div></Card><Card><div className="card-title"><div><h3>Community discussion</h3><p>{grievance.commentCount||0} comments</p></div></div><div className="comment-compose"><input value={comment} onChange={e=>setComment(e.target.value)} placeholder="Add a constructive comment"/><Button onClick={addComment}>Post</Button></div>{message&&<small className="muted">{message}</small>}{comments.map((x:any)=><div className="comment" key={x._id}><Avatar initials={getInitials(x.userId?.name||"User")} small/><div><b>{x.userId?.name||"Citizen"}</b><p>{x.text}</p></div></div>)}</Card></main><aside><Card><h3>Progress</h3><div className="timeline">{["SUBMITTED","AI_PROCESSED","ASSIGNED","ACKNOWLEDGED","IN_PROGRESS","RESOLUTION_SUBMITTED","VERIFICATION","RESOLVED"].map((status,i)=>{const order=["SUBMITTED","AI_PROCESSED","ASSIGNED","ACKNOWLEDGED","IN_PROGRESS","RESOLUTION_SUBMITTED","VERIFICATION","RESOLVED"];const current=order.indexOf(grievance.status);return <div className={i<=current?"done":""} key={status}><span><Icon name={i<=current?"check":"clock"} size={14}/></span><p><b>{status.replace(/_/g," ")}</b><small>{i<=current?"Completed":"Pending"}</small></p></div>})}</div></Card><Card className="whatsapp-optin-card citizen-detail-whatsapp"><div className="card-title"><div><h3>📱 WhatsApp updates</h3>  <p>Receive status changes and assigned Person of Contact (POC) details for your grievance.</p></div></div><div className="whatsapp-choice-row"><label><input type="radio" name="detail-whatsapp-optin" checked={whatsappEnabled} onChange={()=>setWhatsappEnabled(true)}/> Yes, notify me</label><label><input type="radio" name="detail-whatsapp-optin" checked={!whatsappEnabled} onChange={()=>{setWhatsappEnabled(false);setWhatsappConsent(false)}}/> No, thanks</label></div>{whatsappEnabled&&<><label className="field"><span>WhatsApp number</span><div className="whatsapp-number-field"><span>+91</span><input type="tel" inputMode="numeric" maxLength={10} value={whatsappNumber} onChange={e=>setWhatsappNumber(e.target.value.replace(/\D/g,"").slice(0,10))} placeholder="10-digit mobile number"/></div></label><label className="consent whatsapp-consent"><input type="checkbox" checked={whatsappConsent} onChange={e=>setWhatsappConsent(e.target.checked)}/> I consent to grievance-related WhatsApp updates and POC details. I can opt out later.</label></>}<Button variant="accent" disabled={savingWhatsapp} onClick={saveWhatsappPreference}>{savingWhatsapp?"Saving…":"Save WhatsApp preference"}</Button></Card><Card><h3>Assignment</h3>{officer?<div className="officer"><Avatar initials={getInitials(officer.userId?.name||"Officer")} src={officer.userId?.profileImage} useDefault/><div><b>{officer.userId?.name||"Assigned officer"}</b><small>{officer.team||"Field officer"}</small></div></div>:<p>Not assigned yet.</p>}<p>{grievance.departments?.join(", ")||"Routing pending"}</p></Card>{grievance.poc&&<Card className="poc-display-card"><h3>Point of Contact</h3><div className="poc-contact-details"><b>{grievance.poc.name}</b><span>{grievance.poc.designation}</span><span>{grievance.poc.department}</span><span>☎ {grievance.poc.officialContact}</span><span>Office hours: {grievance.poc.officeHours||"Not specified"}</span></div></Card>}<Card className="dispute"><h3>{["RESOLUTION_SUBMITTED","VERIFICATION"].includes(grievance.status)?"Verify the resolution":grievance.status==="RESOLVED"?"Does the issue still exist?":"Resolution status"}</h3><p>{["RESOLUTION_SUBMITTED","VERIFICATION"].includes(grievance.status)?"Confirm the repair or reopen the grievance if the issue remains.":grievance.status==="RESOLVED"?"If the reported issue has not actually been resolved, reopen it for further action.":"The issue-still-exists action becomes available after a resolution is submitted or marked resolved."}</p>{["RESOLUTION_SUBMITTED","VERIFICATION"].includes(grievance.status)?<div className="verify-actions"><Button variant="accent" onClick={()=>api.grievances.verify(String(grievance._id),"approve").then(g=>{setGrievance(g);setMessage("Resolution verified. Grievance resolved.")}).catch(e=>setMessage(e.message))}>Verify Resolution</Button><Button variant="secondary" onClick={()=>api.grievances.verify(String(grievance._id),"reopen").then(g=>{setGrievance(g);setMessage("Grievance reopened.")}).catch(e=>setMessage(e.message))}>Issue Still Exists</Button></div>:grievance.status==="RESOLVED"?<Button variant="secondary" onClick={()=>api.grievances.dispute(String(grievance._id),"Citizen reports that the issue still exists").then(g=>{setGrievance(g);setMessage("Verification request submitted. The grievance has been reopened.")}).catch(e=>setMessage(e instanceof Error?e.message:"Unable to reopen grievance."))}>Issue Still Exists</Button>:<span className="dispute-locked">Available after resolution</span>}</Card></aside></div></div>;
}

function ReportFlow({ go, location, mode = "grievance" }: { go:(s:Screen)=>void; location:LocationState; mode?: "grievance" | "emergency" }) {
  const [step,setStep]=useState(1);
  const [description,setDescription]=useState("");
  const [reportHazard,setReportHazard]=useState("FLOOD");
  const [affectedPeople,setAffectedPeople]=useState("");
  const [affectedArea,setAffectedArea]=useState("");
  const [latitude,setLatitude]=useState<number|null>(location?.latitude??null);
  const [longitude,setLongitude]=useState<number|null>(location?.longitude??null);
  const [files,setFiles]=useState<File[]>([]);
  const [media,setMedia]=useState<any[]>([]);
  const [analysis,setAnalysis]=useState<AIAnalysis|null>(null);
  const [submitting,setSubmitting]=useState(false);
  const [error,setError]=useState("");
  const [whatsappEnabled,setWhatsappEnabled]=useState(false);
  const [whatsappNumber,setWhatsappNumber]=useState("");
  const [whatsappConsent,setWhatsappConsent]=useState(false);
  const [recording,setRecording]=useState(false);
  const [recordSeconds,setRecordSeconds]=useState(0);
  const recorderRef=useRef<MediaRecorder|null>(null);
  const chunksRef=useRef<Blob[]>([]);
  const timerRef=useRef<number|null>(null);
  const fileInputRef=useRef<HTMLInputElement>(null);
  const videoInputRef=useRef<HTMLInputElement>(null);

  useEffect(()=>{if(location && latitude===null && longitude===null){setLatitude(location.latitude);setLongitude(location.longitude)}},[location?.latitude,location?.longitude]);
  useEffect(()=>()=>{if(timerRef.current)window.clearInterval(timerRef.current); recorderRef.current?.stop();},[]);

  const addFiles=(incoming:File[])=>setFiles(prev=>[...prev,...incoming.filter(file=>!file.type.startsWith("audio/") && (file.type.startsWith("image/") || file.type.startsWith("video/")))].slice(0,10));
  const addVoiceFile=(file:File)=>setFiles(prev=>[...prev.filter(existing=>!existing.type.startsWith("audio/")),file].slice(0,10));
  const voiceFile=files.find(file=>file.type.startsWith("audio/"));
  const hasVoice=Boolean(voiceFile);

  const startRecording=async()=>{
    try{
      setError("");
      const stream=await navigator.mediaDevices.getUserMedia({audio:true});
      const recorder=new MediaRecorder(stream);
      chunksRef.current=[];
      recorder.ondataavailable=e=>{if(e.data.size)chunksRef.current.push(e.data)};
      recorder.onstop=()=>{
        stream.getTracks().forEach(t=>t.stop());
        const blob=new Blob(chunksRef.current,{type:recorder.mimeType||"audio/webm"});
        const file=new File([blob],`civix-voice-${Date.now()}.webm`,{type:blob.type});
        addVoiceFile(file);
        setRecording(false);
        if(timerRef.current)window.clearInterval(timerRef.current);
      };
      recorderRef.current=recorder; recorder.start(); setRecording(true); setRecordSeconds(0);
      timerRef.current=window.setInterval(()=>setRecordSeconds(x=>x+1),1000);
    }catch(e){setError(e instanceof Error?e.message:"Microphone permission is required for voice input.")}
  };
  const stopRecording=()=>{if(recorderRef.current?.state!=="inactive")recorderRef.current?.stop()};

  const prepareAI=async()=>{
    if((!description.trim()&&!hasVoice)||latitude===null||longitude===null){setError("Describe the issue or use Speak, and select an incident location before AI analysis.");return;}
    try{
      setError("");
      let uploaded=media;
      if(files.length && media.length===0){uploaded=(await api.upload(files)).items;setMedia(uploaded)}
      const result=await api.grievances.analyzePreview({text:description.trim(),location:{latitude,longitude},media:uploaded});
      setAnalysis(result);setStep(5);
    }catch(e){setError(e instanceof Error?e.message:"AI analysis failed.")}
  };
  const next=async()=>{
    if(step===3){if(latitude===null||longitude===null){setError("Select the incident location on the map or use your current location.");return;}setStep(4);return;}
    if(step===4){if(mode==="emergency"){if(description.trim().length<8){setError("Please describe the emergency in at least a few words before continuing.");return;}setStep(5);return;}await prepareAI();return;}
    if(step<3){setStep(step+1);return;}
    if(mode==="grievance"&&whatsappEnabled){
      const digits=whatsappNumber.replace(/\D/g,"");
      if(!/^\d{10}$/.test(digits)){setError("Enter a valid 10-digit Indian WhatsApp number.");return;}
      if(!whatsappConsent){setError("Please consent to receive grievance updates on WhatsApp.");return;}
    }
    setSubmitting(true);
    try{
      let uploaded=media;
      if(files.length && !uploaded.length)uploaded=(await api.upload(files)).items;
      if(mode==="emergency"){
        const emergencyDescription=(description.trim()||analysis?.summary||analysis?.title||"").trim();
        if(emergencyDescription.length<8){setError("Please describe the emergency in at least a few words.");return;}
        const report=await api.emergency.createReport({description:emergencyDescription,hazardType:reportHazard,affectedPeople:Number(affectedPeople)||0,affectedArea:affectedArea.trim(),coordinates:[longitude,latitude],media:uploaded});
        localStorage.setItem("civix_last_emergency_report",JSON.stringify(report));
        go("emergency-success");
      }else{
        const grievance=await api.grievances.create({text:description.trim(),location:{latitude,longitude},media:uploaded,whatsappEnabled,whatsappNumber:whatsappEnabled?`+91${whatsappNumber.replace(/\D/g,"")}`:undefined,whatsappConsent:whatsappEnabled&&whatsappConsent});
        localStorage.setItem("civix_last_grievance",JSON.stringify(grievance));
        localStorage.setItem("civix_selected_grievance",String(grievance._id||grievance.grievanceId));
        go("success");
      }
    }catch(e){setError(e instanceof Error?e.message:"Unable to submit grievance.")}finally{setSubmitting(false)}
  };
  const useCurrentLocation=()=>{if(!navigator.geolocation){setError("Geolocation is not supported.");return;}navigator.geolocation.getCurrentPosition(p=>{setLatitude(p.coords.latitude);setLongitude(p.coords.longitude);setError("")},e=>setError(e.message||"Unable to access live location"),{enableHighAccuracy:true,timeout:15000,maximumAge:0})};
  const locText=latitude!==null&&longitude!==null?`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`:"No incident location selected";
  const selectedEvidence=files.filter(file=>!file.type.startsWith("audio/"));
  return <div className="report-page"><header><Logo/><button className="close-report" onClick={()=>go("home")}>Close ×</button></header><div className="report-shell"><aside><span>{mode==="emergency"?"EMERGENCY REPORT":"NEW GRIEVANCE"}</span><h1>{mode==="emergency"?"Report an emergency":"Report an issue"}</h1><p>{mode==="emergency"?"Share what is happening and mark the exact location so responders can assess the situation.":"Clear details help your city respond faster."}</p><div className="stepper">{["Describe","Evidence","Location",mode==="emergency"?"Emergency triage":"AI Analysis","Review"].map((x,i)=><button key={x} className={`${i+1===step?"active":""} ${i+1<step?"done":""}`} onClick={()=>i+1<=step&&setStep(i+1)}><span>{i+1<step?<Icon name="check" size={14}/>:i+1}</span><div><b>{x}</b><small>{["Tell us what happened","Add photo or video evidence","Choose exact incident location",mode==="emergency"?"Review urgency and needs":"AI routing & impact","Check before submitting"][i]}</small></div></button>)}</div></aside><main><div className="report-heading"><span>STEP {step} OF 5</span><h2>{["What’s happening?","Add supporting evidence","Where is the issue?",mode==="emergency"?"Emergency triage":"AI analysis","Review your report"][step-1]}</h2><p>{["Type the issue or speak it instead.","Add photo or video evidence. Voice is already part of your report.","Use GPS or choose any incident location on the map.",mode==="emergency"?"Review the emergency details before submitting for server-side triage.":"AI analyzes the actual report and evidence.","Everything is loaded from the current draft."][step-1]}</p></div>
  {step===1&&<div className="description-composer"><label className="field textarea"><span>{mode==="emergency"?"Emergency description":"Issue description"}</span><textarea value={description} onChange={e=>setDescription(e.target.value)} placeholder={mode==="emergency"?"Describe the danger, who may be affected, and what help is needed…":"Describe the issue you see…"} maxLength={1000}/><small>{description.length} / 1,000</small></label>{mode==="emergency"&&<div className="emergency-intake-fields"><label className="field"><span>Emergency type</span><select value={reportHazard} onChange={e=>setReportHazard(e.target.value)}><option value="FLOOD">Flood / waterlogging</option><option value="FIRE">Fire / smoke</option><option value="EARTHQUAKE">Earthquake</option><option value="LANDSLIDE">Landslide</option><option value="STORM">Storm / severe weather</option><option value="INFRASTRUCTURE">Infrastructure failure</option><option value="MEDICAL">Medical emergency</option><option value="OTHER">Other / unsure</option></select></label><label className="field"><span>Estimated people affected (optional)</span><input type="number" min="0" max="1000000" value={affectedPeople} onChange={e=>setAffectedPeople(e.target.value)} placeholder="Leave blank if unknown"/></label><label className="field"><span>Area / landmark (optional)</span><input value={affectedArea} onChange={e=>setAffectedArea(e.target.value)} maxLength={160} placeholder="Ward, road, landmark"/></label></div>}<div className="voice-description"><button type="button" className={recording?"recording":""} onClick={recording?stopRecording:startRecording}><span><Icon name="mic" size={28}/></span><b>{recording?`Stop speaking · ${String(Math.floor(recordSeconds/60)).padStart(2,"0")}:${String(recordSeconds%60).padStart(2,"0")}`:"Speak instead"}</b><small>{recording?"Tap to stop and keep this voice report":"Use your voice instead of typing"}</small></button>{voiceFile&&<div className="uploaded"><div><b>Voice report recorded</b><small>{voiceFile.name}</small></div><Icon name="check"/></div>}</div></div>}
  {step===2&&<div className="evidence-composer"><input ref={fileInputRef} type="file" multiple accept="image/*" hidden onChange={e=>addFiles(Array.from(e.target.files??[]))}/><input ref={videoInputRef} type="file" multiple accept="video/*" hidden onChange={e=>addFiles(Array.from(e.target.files??[]))}/><div className="upload-grid"><button type="button" onClick={()=>fileInputRef.current?.click()}><span><Icon name="camera" size={28}/></span><b>Add Photo</b><small>JPG, PNG</small></button><button type="button" onClick={()=>videoInputRef.current?.click()}><span><Icon name="video" size={28}/></span><b>Add Video</b><small>MP4, WebM</small></button></div>{selectedEvidence.length>0&&<div className="uploaded"><div><b>{selectedEvidence.length} evidence file{selectedEvidence.length===1?"":"s"} selected</b><small>{selectedEvidence.map(f=>f.name).join(" · ")}</small></div><Icon name="check"/></div>}{voiceFile&&<div className="voice-media-note"><Icon name="mic" size={16}/><span>Voice report will be kept as media and used by AI for transcription and routing.</span></div>}</div>}
  {step===3&&<><CityMap location={location} selectable selectedLocation={latitude!==null&&longitude!==null?{latitude,longitude}:null} onSelectLocation={(lat,lng)=>{setLatitude(lat);setLongitude(lng);setError("")}}/><div className="location-card"><Icon name="pin"/><div><b>{latitude!==null?"Incident location selected":"Location required"}</b><small>{locText}{location?.accuracy?` · Live accuracy ${Math.round(location.accuracy)}m`:""}</small></div><Button variant="secondary" onClick={useCurrentLocation}>Use current location</Button></div><p className="location-hint">Tip: click anywhere on the map to report an issue at a different location.</p></>}
  {step===4&&<div className="analysis-card"><div className="analysis-title"><span className="ai-orb"><Icon name="settings"/></span><div><Status tone="sky">{analysis?(mode==="emergency"?"Pre-check complete":"AI analysis complete"):"AI ready"}</Status><h3>{mode==="emergency"?"Review emergency details":"Analyze this actual report"}</h3></div>{analysis&&<b>{Math.round(((analysis.confidence.category+analysis.confidence.severity+analysis.confidence.impact)/3)*100)}% confidence</b>}</div>{mode==="emergency"&&<p className="emergency-triage-note">Emergency triage runs after submission. AI recommendations are advisory and require coordinator review.</p>}{analysis?<div className="analysis-grid">{[["AI heading",analysis.title,"feed"],["Short description",analysis.summary,"comment"],["Category",analysis.category,"shield"],["Severity",analysis.severity,"clock"],["Impact score",`${analysis.impactScore} / 100`,"chart"],["Department",analysis.departments.join(", ")||"Unassigned","users"],["Possible duplicates",analysis.duplicate?.isDuplicate?`${Math.round((analysis.duplicate.similarity||0)*100)}% match`:"None detected","feed"],["Language",analysis.language,"settings"]].map(x=><div key={x[0]}><span><Icon name={x[2]}/></span><small>{x[0]}</small><b>{x[1]}</b></div>)}</div>:<Button onClick={mode==="emergency"?()=>{if(description.trim().length<8){setError("Please describe the emergency in at least a few words before continuing.");return;}setStep(5)}:prepareAI} disabled={mode==="emergency"?description.trim().length<8:(!description&&!hasVoice)||latitude===null}>{mode==="emergency"?"Continue to review":"Run AI analysis"}</Button>}</div>}
  {step===5&&<div className="review"><Card><div className="eyebrow">{mode==="emergency"?"EMERGENCY REPORT REVIEW":"DRAFT REVIEW"}</div><h3>{analysis?.title||description||"Voice report"}</h3><p className="review-text">{analysis?.summary||"AI-generated summary will appear here."}</p><div className="review-facts"><span><b>Location</b>{locText}</span>{mode==="emergency"?<><span><b>Emergency type</b>{reportHazard.replace(/_/g," ")}</span><span><b>Estimated affected</b>{affectedPeople||"Unknown"}</span><span><b>Area / landmark</b>{affectedArea||"Not specified"}</span></>:<span><b>Department</b>{analysis?.departments.join(", ")||"AI will route"}</span>}<span><b>Evidence</b>{media.length||files.length} file(s)</span></div><p>{mode==="emergency"?"Emergency triage will run after submission. A coordinator reviews all recommendations.":analysis?`${analysis.category} · ${analysis.severity} · impact ${analysis.impactScore}/100`:"AI analysis pending"}</p></Card>
    {mode==="grievance"&&<Card className="whatsapp-optin-card"><div className="card-title"><div><h3>📱 Stay updated on WhatsApp</h3><p>Receive grievance status updates and your assigned Person of Contact (POC) details.</p></div><Status tone={whatsappEnabled?"green":"sky"}>{whatsappEnabled?"Opted in":"Optional"}</Status></div>
      <div className="whatsapp-choice-row"><label><input type="radio" name="whatsapp-optin" checked={whatsappEnabled} onChange={()=>setWhatsappEnabled(true)}/> Yes, send me WhatsApp updates</label><label><input type="radio" name="whatsapp-optin" checked={!whatsappEnabled} onChange={()=>{setWhatsappEnabled(false);setWhatsappConsent(false)}}/> No, thank you</label></div>
      {whatsappEnabled&&<><label className="field"><span>WhatsApp number</span><div className="whatsapp-number-field"><span>+91</span><input type="tel" inputMode="numeric" maxLength={10} value={whatsappNumber} onChange={e=>setWhatsappNumber(e.target.value.replace(/\D/g,"").slice(0,10))} placeholder="10-digit mobile number"/></div></label><label className="consent whatsapp-consent"><input type="checkbox" checked={whatsappConsent} onChange={e=>setWhatsappConsent(e.target.checked)}/> I agree to receive grievance-related WhatsApp notifications from CiviX, including POC details when assigned. I can opt out later.</label></>}
    </Card>}
    <label className="consent"><input type="checkbox" defaultChecked/> I confirm this report is accurate and contains no unnecessary personal information.</label></div>}
  {error&&<p style={{color:"#dc2626",fontSize:"14px"}}>{error}</p>}<div className="report-actions"><Button variant="ghost" onClick={()=>step===1?go("home"):setStep(step-1)}>Back</Button><Button className="report-submit-btn" variant={step===5?"accent":"primary"} onClick={next} disabled={submitting}>{submitting?"Submitting…":step===5?(mode==="emergency"?"Submit emergency report":"Post Grievance"):"Continue"} <Icon name="arrow" size={17}/></Button></div></main></div></div>;
}

function EmergencySuccess({ go }: { go: (s: Screen) => void }) {
  const [report] = useState<any>(() => { try { return JSON.parse(localStorage.getItem("civix_last_emergency_report") || "null"); } catch { return null; } });
  return <div className="success-page"><Logo/><Card><div className="success-icon"><Icon name="check" size={32}/></div><Status tone="green">Emergency report submitted</Status><h1>Your report has reached the response review queue.</h1><p>Emergency triage will assess the hazard and possible resource needs. A coordinator must review any recommendations before dispatch.</p><div className="success-id"><span>EMERGENCY REPORT ID</span><b>{report?.reportCode || "Submitted"}</b><button onClick={()=>navigator.clipboard?.writeText(report?.reportCode || "")}>Copy</button></div><div className="success-facts"><span><small>Emergency type</small><b>{String(report?.hazardType || "Pending triage").replace(/_/g," ")}</b></span><span><small>Severity</small><b>{report?.severity || "Pending triage"}</b></span><span><small>Location</small><b>{report?.location?.coordinates?.length===2?`${report.location.coordinates[1]}, ${report.location.coordinates[0]}`:"Location submitted"}</b></span></div><div className="success-actions"><Button onClick={()=>go("emergency")}>Open Emergency Response</Button><Button variant="secondary" onClick={()=>go("home")}>Back to Home</Button></div><p className="emergency-triage-note">If someone is in immediate danger in India, call 112. CIVIX does not dispatch official emergency services automatically.</p></Card></div>;
}

function Success({ go }: { go: (s: Screen) => void }) {
  const [grievance] = useState<Grievance | null>(() => {
    try { return JSON.parse(localStorage.getItem("civix_last_grievance") || "null"); } catch { return null; }
  });
  const category = grievance?.category ? grievance.category.replace(/_/g," ").replace(/^./,c=>c.toUpperCase()) : "Pending AI analysis";
  const department = grievance?.departments?.[0]?.replace(/_/g," ") || "Pending routing";
  const location = grievance?.location?.coordinates?.length===2 ? grievance.location.coordinates.join(", ") : "Location recorded in backend";
  return <div className="success-page"><Logo/><Card><div className="success-icon"><Icon name="check" size={32}/></div><Status tone="green">Successfully submitted</Status><h1>Your grievance is in motion.</h1><p>We’ve routed it to {department} and will notify you at every important step.</p><div className="success-id"><span>GRIEVANCE ID</span><b>{grievance?.grievanceId || "Unavailable"}</b><button onClick={()=>navigator.clipboard?.writeText(grievance?.grievanceId || "")}>Copy</button></div><div className="success-facts"><span><small>Category</small><b>{category}</b></span><span><small>Department</small><b>{department}</b></span><span><small>Location</small><b>{location}</b></span></div><div className="mini-timeline">{["SUBMITTED","AI_PROCESSED","ASSIGNED","ACKNOWLEDGED","IN_PROGRESS","RESOLVED"].map((x,i)=>{const order=["SUBMITTED","AI_PROCESSED","ASSIGNED","ACKNOWLEDGED","IN_PROGRESS","RESOLVED"];const current=order.indexOf(grievance?.status||"SUBMITTED");return <div className={i<=current?"done":""} key={x}><span>{i<=current?<Icon name="check" size={12}/>:i+1}</span><small>{x.replace(/_/g," ")}</small></div>})}</div><div className="success-actions"><Button onClick={()=>go("detail")}>Track Grievance</Button><Button variant="secondary" onClick={()=>go("feed")}>View Civic Feed</Button></div></Card></div>;
}

function Notifications({ go, role }: { go:(s:Screen)=>void; role:Role }) {
 const [items,setItems]=useState<any[]>([]); const [loading,setLoading]=useState(true); const [error,setError]=useState("");
 const copy = role === "citizen"
   ? { eyebrow:"YOUR CIVIC UPDATES", title:"My notifications", description:"Only updates about your grievances, resolutions and reports." }
   : role === "officer"
   ? { eyebrow:"OFFICER ALERTS", title:"My notifications", description:"Only assignments, status changes and resolution activity for your cases." }
   : { eyebrow:"ADMIN ALERTS", title:"My notifications", description:"Only platform alerts that need administrator attention, such as officer logins and AI routing reviews." };
 const load=()=>{setLoading(true);api.notifications(new URLSearchParams({page:"1",limit:"50"})).then(r=>{setItems(r.items);setError("")}).catch(e=>setError(e instanceof Error?e.message:"Unable to load notifications")).finally(()=>setLoading(false))};
 useEffect(()=>{load()},[role]);
 const markOne=async(id:string)=>{try{await api.markNotificationRead(id);setItems(x=>x.map(n=>n._id===id?{...n,read:true}:n))}catch{}};
 const markAll=async()=>{try{await api.markAllNotificationsRead();setItems(x=>x.map(n=>({...n,read:true})))}catch{}};
 return <div className="page narrow-page"><div className="page-heading"><div><span className="eyebrow">{copy.eyebrow}</span><h1>{copy.title}</h1><p>{copy.description}</p></div><Button variant="ghost" onClick={markAll}>Mark all as read</Button></div>{error&&<Card><div className="empty-state">{error}</div></Card>}<Card className="notification-list">{loading?<div className="empty-state">Loading notifications…</div>:items.length?items.map(n=><button key={n._id} className={!n.read?"unread":""} onClick={()=>{markOne(n._id);if(n.grievanceId){localStorage.setItem("civix_selected_grievance",String(n.grievanceId._id||n.grievanceId));go(role==="officer"?"incident":"detail")}}}><span className="notif-icon"><Icon name={n.type==="resolution"||n.type==="verification"?"check":n.type==="assignment"?"users":n.type==="dispute"?"shield":"bell"}/></span><div><b>{n.title||n.type||"Notification"}</b><p>{n.message||"CiviX has an update for you."}</p><small>{n.createdAt?new Date(n.createdAt).toLocaleString():""}</small></div>{!n.read&&<i/>}</button>):<div className="empty-state">No role-specific notifications yet.</div>}</Card></div>;
}
function Profile({ go, user, onUser, impactOnly = false }: { go:(s:Screen)=>void; user:User; onUser:(u:User)=>void; impactOnly?: boolean }) {
  const [profile,setProfile]=useState<any>(null);
  const [civic,setCivic]=useState<any>(null);
  const [challenge,setChallenge]=useState<any>(null);
  const [certificates,setCertificates]=useState<any[]>([]);
  const [editing,setEditing]=useState(false);
  const [profileSection,setProfileSection]=useState<"grievances"|"impact">("grievances");
  const [impactLanguage,setImpactLanguage]=useState<"en"|"hi">("en");
  const hi=impactLanguage==="hi";
  const ui=(en:string, hindi:string)=>hi?hindi:en;
  const badgeHindiName=(name:string)=>hi?(({"Newbie":"नवागंतुक","First Fix":"पहला समाधान","Road Advocate":"सड़क प्रहरी","Community Contributor":"समुदाय सहयोगी","Ward Champion":"वार्ड चैंपियन","City Guardian":"शहर संरक्षक","Consistent Contributor":"निरंतर योगदानकर्ता","Light Bringer":"रोशनी लाने वाला","Clean Streets":"स्वच्छ सड़कें","Water Watcher":"जल प्रहरी","Eagle Eye":"सतर्क दृष्टि","Closer":"समाधानकर्ता"} as Record<string,string>)[name]||name):name;
  const badgeHindiDescription=(description:string)=>hi?(({"Your CiviX journey starts here. Resolve your first verified report to earn the next badge.":"आपकी CiviX यात्रा यहाँ से शुरू होती है। अगला बैज पाने के लिए अपनी पहली सत्यापित शिकायत का समाधान कराएँ।","Your first report has been resolved.":"आपकी पहली शिकायत का समाधान हो गया है।","Help resolve 3 road-related issues.":"सड़क से जुड़ी 3 समस्याओं के समाधान में मदद करें।","Help resolve 5 civic issues.":"5 नागरिक समस्याओं के समाधान में मदद करें।","Help resolve 10 civic issues.":"10 नागरिक समस्याओं के समाधान में मदद करें।","Help resolve 25 civic issues.":"25 नागरिक समस्याओं के समाधान में मदद करें।","Earn resolution rewards on 3 consecutive days.":"लगातार 3 दिनों तक समाधान पुरस्कार अर्जित करें।","Help resolve 3 street-light issues.":"स्ट्रीट लाइट की 3 समस्याओं के समाधान में मदद करें।","Help resolve 3 sanitation or garbage issues.":"सफाई या कचरे से जुड़ी 3 समस्याओं के समाधान में मदद करें।","Help resolve 3 water-supply issues.":"जल आपूर्ति की 3 समस्याओं के समाधान में मदद करें।","Submit 10 civic reports that are verified by the community.":"समुदाय द्वारा सत्यापित 10 नागरिक शिकायतें दर्ज करें।","Confirm 5 officer resolutions with photo evidence.":"फोटो प्रमाण के साथ अधिकारियों के 5 समाधानों की पुष्टि करें।"} as Record<string,string>)[description]||description):description;
  const [name,setName]=useState(user.name);
  const [photoMenu,setPhotoMenu]=useState(false);
  const [uploading,setUploading]=useState(false);
  const fileRef=useRef<HTMLInputElement|null>(null);
  const menuRef=useRef<HTMLDivElement|null>(null);

  useEffect(()=>{api.profile().then((p)=>{setProfile(p);setName(p.name||user.name);onUser({...user,...p});}).catch(()=>{});if(user.role==="citizen"){api.gamification.me().then(setCivic).catch(()=>{});api.gamification.challenges().then(r=>setChallenge(r[0]||null)).catch(()=>{});api.gamification.certificates().then(setCertificates).catch(()=>{});}},[]);
  useEffect(()=>{
    const close=(e:MouseEvent)=>{if(menuRef.current&&!menuRef.current.contains(e.target as Node))setPhotoMenu(false)};
    document.addEventListener("mousedown",close);
    return()=>document.removeEventListener("mousedown",close);
  },[]);
  const save=async()=>{const u=await api.updateProfile({name});setName(u.name);onUser({...user,...u});setProfile((p:any)=>({...p,...u}));setEditing(false)};
  const choosePhoto=()=>{setPhotoMenu(false);fileRef.current?.click()};
  const uploadPhoto=async(file?:File)=>{
    if(!file)return;
    if(!file.type.startsWith("image/")){alert("Please choose an image file.");return;}
    if(file.size>5*1024*1024){alert("Profile photo must be 5 MB or smaller.");return;}
    setUploading(true);
    try{
      const result=await api.upload([file]);
      const url=result.items?.[0]?.url;
      if(!url)throw new Error("Image upload did not return a URL.");
      const u=await api.updateProfile({profileImage:url});
      onUser({...user,...u});
      setProfile((p:any)=>({...p,...u}));
    }catch(e){alert(e instanceof Error?e.message:"Unable to update profile photo.");}
    finally{setUploading(false)}
  };
  const removePhoto=async()=>{
    setPhotoMenu(false);setUploading(true);
    try{
      const u=await api.updateProfile({profileImage:""});
      onUser({...user,...u});setProfile((p:any)=>({...p,...u}));
    }catch(e){alert(e instanceof Error?e.message:"Unable to remove profile photo.");}
    finally{setUploading(false)}
  };
  const stats=profile?.stats||{};
  const role=user.role;
  const officer=profile?.officer;
  const isCitizen=role==="citizen";
  const subtitle=isCitizen?"Your civic activity and submitted grievances.":role==="officer"?"Your government identity, department coverage and assigned work.":"Your system administration identity and live platform responsibility.";
  return <div className={`page narrow-page ${impactOnly ? "civic-impact-page" : ""}`}>
    {!impactOnly && <Card className={`profile-card role-profile ${role}`}>
      <div className="profile-cover eagle-profile-cover" aria-hidden="true"><div className="profile-eagle-art" style={{"--eagle-profile-image": `url("${eagleProfile}")`} as React.CSSProperties}/><div className="profile-cover-shade"/></div>
      <div className="profile-main">
        <div className="profile-avatar-menu" ref={menuRef}>
          <button type="button" className="profile-avatar-trigger" onClick={()=>setPhotoMenu(x=>!x)} aria-label="Manage profile photo" aria-expanded={photoMenu} disabled={uploading}>
            <Avatar initials={getInitials(user.name)} src={user.profileImage} useDefault/>
            <span className="profile-avatar-edit">{uploading?"…":"✎"}</span>
          </button>
          {photoMenu&&<div className="profile-photo-menu" role="menu">
            <button type="button" onClick={choosePhoto} role="menuitem">📷 <span>{user.profileImage?"Change photo":"Add photo"}</span></button>
            {user.profileImage&&<button type="button" className="danger" onClick={removePhoto} role="menuitem">🗑 <span>Remove photo</span></button>}
          </div>}
          <input ref={fileRef} className="profile-file-input" type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={e=>{const file=e.target.files?.[0];e.target.value="";uploadPhoto(file)}}/>
        </div>
        <div className="profile-role-badge">{role.toUpperCase()}</div>
        {isCitizen&&<Button variant="secondary" onClick={()=>setEditing(x=>!x)}>{editing?"Cancel":"Edit profile"}</Button>}
        {editing?<div className="field"><span>Name</span><input value={name} onChange={e=>setName(e.target.value)}/><Button onClick={save}>Save</Button></div>:<><h2 className="profile-name">{user.name}</h2><span className="profile-handle">@{user.username}{user.governmentId?` · ${user.governmentId}`:` · ${role}`}</span></>}
        <p>{subtitle}</p>
        {role!=="citizen"&&<div className="profile-government"><div><span>Email</span><b>{user.email||"—"}</b></div><div><span>Government ID</span><b>{user.governmentId||"—"}</b></div>{role==="officer"&&<div><span>Employee ID</span><b>{officer?.employeeId||"—"}</b></div>}{role==="officer"&&<div><span>Departments</span><b>{officer?.departments?.map((d:any)=>d.name).join(", ")||"—"}</b></div>}</div>}
        <div className="profile-stats">
          {role==="citizen"&&<><div><b>{stats.total??0}</b><span>Grievances</span></div><div><b>{stats.resolved??0}</b><span>Resolved</span></div><div><b>{stats.pending??0}</b><span>Pending</span></div><div><b>{stats.inProgress??0}</b><span>In progress</span></div></>}
          {role==="officer"&&<><div><b>{stats.assigned??0}</b><span>Assigned</span></div><div><b>{stats.pending??0}</b><span>Pending</span></div><div><b>{stats.inProgress??0}</b><span>In progress</span></div><div><b>{stats.resolved??0}</b><span>Resolved</span></div></>}
          {role==="admin"&&<><div><b>{stats.totalGrievances??0}</b><span>Total grievances</span></div><div><b>{stats.activeGrievances??0}</b><span>Active</span></div><div><b>{stats.officers??0}</b><span>Officers</span></div><div><b>{stats.aiReviewQueue??0}</b><span>AI review</span></div></>}
        </div>
      </div>
    </Card>}
    {isCitizen && (impactOnly ? <Card className="civic-impact-card full-civic-impact"><div className="impact-title-row"><div className="card-title"><div><span className="eyebrow">{ui("CIVIC IMPACT","नागरिक प्रभाव")}</span><h3>{ui("Your contribution matters","आपका योगदान महत्वपूर्ण है")}</h3><p>{ui("Points are awarded only once a report is resolved—not when you submit more reports.","अंक शिकायत के समाधान पर मिलते हैं—सिर्फ अधिक शिकायतें दर्ज करने पर नहीं।")}</p></div><span aria-label={ui("Civic points","नागरिक अंक")} className="impact-points-total">⭐ {civic?.points??0} <small>{ui("points","अंक")}</small></span></div><button type="button" className="impact-language-toggle" onClick={()=>setImpactLanguage(hi?"en":"hi")} aria-label={hi?"Switch to English":"हिंदी में देखें"}>{hi?"English":"हिंदी"}</button></div><div className="profile-stats"><div><b>{civic?.resolvedReports??stats.resolved??0}</b><span>{ui("Issues resolved","समाधान की गई समस्याएँ")}</span></div><div><b>{civic?.level?.name??"Newcomer"}</b><span>{ui("Current level","वर्तमान स्तर")}</span></div><div><b>{civic?.streak?.current??0} {ui("days","दिन")}</b><span>{ui("Resolution streak","लगातार समाधान")}</span></div><div><b>{civic?.impact?.estimatedPeopleHelped??0}</b><span>{ui("Estimated people helped","अनुमानित लाभार्थी")}</span></div></div><div className="civic-badges-section"><div className="civic-section-heading"><div><span className="eyebrow">{ui("CIVIC BADGES","नागरिक बैज")}</span><h4>{ui("Milestones earned through verified civic participation","सत्यापित नागरिक भागीदारी से अर्जित उपलब्धियाँ")}</h4><p>{ui("Resolve issues and take part in your community to unlock milestones.","उपलब्धियाँ अनलॉक करने के लिए समस्याओं का समाधान करें और समुदाय में भाग लें।")}</p></div><span className="badge-count">{(civic?.badges??[]).filter((b:any)=>b.earned).length} / {(civic?.badges??[]).length} {ui("Unlocked","अनलॉक")}</span></div><div className="civic-badges-grid civic-badge-gallery">{(civic?.badges??[]).map((b:any)=><div className={`civic-earned-badge civic-gallery-badge ${b.earned?'is-earned':'is-locked'}`} key={b.id} title={b.description}><span className="civic-earned-badge-icon">{getBadgeImage(b)?<img className="civic-earned-badge-image" src={getBadgeImage(b)} alt={`${b.name} badge`} />:<Icon name={b.icon||"badge-check"} size={23}/>}</span><span className="civic-earned-badge-copy"><b>{badgeHindiName(b.name)}</b><small>{badgeHindiDescription(b.description)}</small><em>{b.earned?`✓ ${ui("Unlocked","अनलॉक")}`:`🔒 ${ui("Locked","लॉक है")}`}</em></span></div>)}</div></div><div className="impact-level-card"><div className="civic-section-heading"><div><span className="eyebrow">{ui("CURRENT LEVEL","वर्तमान स्तर")}</span><h4>{civic?.level?.name??'Newcomer'} <span className="level-hindi">({ui("Citizen","नागरिक")})</span></h4></div><strong>{civic?.points??0}<small>{ui("Civic Points","नागरिक अंक")}</small></strong></div>{(()=>{const resolved=civic?.resolvedReports??0;const min=civic?.level?.minResolved??0;const next=civic?.nextLevel;const span=next?Math.max(1,next.minResolved-min):1;const pct=next?Math.max(0,Math.min(100,((resolved-min)/span)*100)):100;return <><div className="impact-progress"><span style={{width:`${pct}%`}}/></div><div className="impact-progress-labels"><span>{Math.round(pct)}% {ui("completed","पूरा")}</span><span>{next?`${ui('Next level:','अगला स्तर:')} ${next.name}`:ui('Top level reached','अधिकतम स्तर प्राप्त')}</span></div>{next&&<small className="impact-next-level">{Math.max(0,next.minResolved-resolved)} {ui("more resolved issue(s) needed for the next level","और समस्याओं का समाधान अगले स्तर के लिए आवश्यक") }</small>}</>})()}</div><div className="impact-community-card"><span className="eyebrow">{ui("COMMUNITY IMPACT","सामुदायिक प्रभाव")}</span><h4>{ui("You helped an estimated","आपने अनुमानित मदद की")}</h4><div className="impact-people">~{civic?.impact?.estimatedPeopleHelped??0} <small>{ui("citizens across","नागरिकों की")}</small></div><p>{civic?.impact?.issuesResolved??civic?.resolvedReports??0} {ui("resolved civic issues.","नागरिक समस्याओं का समाधान।")}</p><small className="impact-estimate-note">{ui("An estimate based on 200 people per resolved issue, not a measured unique-person count.","यह प्रति हल की गई समस्या पर 200 लोगों के अनुमान पर आधारित है; यह विशिष्ट लाभार्थियों की वास्तविक गणना नहीं है।")}</small><button className="share-impact-button" onClick={()=>{const message=`I’m making my city better with CiviX! I’ve helped resolve ${civic?.resolvedReports??0} civic issues and earned ${civic?.points??0} Civic Points. Connect. Report. Resolve.`;window.open(`https://wa.me/?text=${encodeURIComponent(message)}`,'_blank','noopener,noreferrer')}}>▣ {ui("Share on WhatsApp","WhatsApp पर साझा करें")}</button></div><div className="impact-ledger-card"><div className="civic-section-heading"><div><span className="eyebrow">{ui("LEDGER AUDIT","अंक विवरण")}</span><h4>{ui("Recent Points Activity","हाल की अंक गतिविधि")}</h4></div></div>{(civic?.recentActivity??[]).length?(civic.recentActivity).map((event:any,i:number)=><div className="impact-ledger-row" key={`${event.awardedAt}-${i}`}><div><b>{event.reason||ui('Report validated','शिकायत सत्यापित')}</b><small>{event.grievanceId?.grievanceId||event.grievanceId||ui('Verified civic contribution','सत्यापित नागरिक योगदान')} · {event.awardedAt?new Date(event.awardedAt).toLocaleDateString():ui('Recently','हाल ही में')}</small></div><strong>+{event.points} {ui("pts","अंक")}</strong></div>):<p className="civic-no-badges">{ui("Your verified points activity will appear here after a resolution earns points.","समाधान पर अंक मिलने के बाद आपकी सत्यापित गतिविधि यहाँ दिखाई देगी।")}</p>}</div>{challenge&&<div className="impact-challenge-card"><div className="challenge-icon">🌧️</div><div className="challenge-main"><span className="eyebrow">{ui("SEASONAL CHALLENGE","मौसमी चुनौती")}</span><h4>{challenge.name} <span className="challenge-bonus">{ui("Challenge active","चुनौती सक्रिय है")}</span></h4><p>{challenge.description}</p><div className="impact-progress"><span style={{width:`${Math.max(0,Math.min(100,challenge.progressPercent??0))}%`}}/></div><small>{challenge.resolvedIssues??0} / {challenge.totalIssues??0} {ui("citywide issues resolved","शहर-स्तरीय समस्याओं का समाधान")} · {challenge.progressPercent??0}%</small></div></div>}<section className="impact-certificates-section"><div className="civic-section-heading"><div><span className="eyebrow">{ui("RECOGNITION","सम्मान")}</span><h4>{ui("Citizen Impact Certificate","नागरिक योगदान प्रमाणपत्र")}</h4><p>{ui("A formal recognition of your verified contribution to the community.","समुदाय के लिए आपके सत्यापित योगदान का औपचारिक सम्मान।")}</p></div></div>{certificates.length?certificates.map((c:any)=><article className="citizen-certificate" key={c.code}><div className="certificate-inner-border"><div className="certificate-topline"><span className="certificate-emblem">✦</span><span>CiviX · CONNECT. REPORT. RESOLVE.</span><span className="certificate-emblem">✦</span></div><div className="certificate-kicker">{ui("CERTIFICATE OF CIVIC CONTRIBUTION","नागरिक योगदान का प्रमाणपत्र")}</div><h3>{ui("Certificate of Appreciation","प्रशंसा प्रमाणपत्र")}</h3><p className="certificate-presented">{ui("This certificate is proudly presented to","यह प्रमाणपत्र सादर प्रदान किया जाता है")}</p><div className="certificate-recipient">{user.name}</div><p className="certificate-description">{c.description||ui("In recognition of meaningful civic participation and verified community impact.","सार्थक नागरिक भागीदारी और सत्यापित सामुदायिक योगदान के सम्मान में।")}</p><div className="certificate-metrics"><div><b>{civic?.resolvedReports??stats.resolved??0}</b><span>{ui("Issues resolved","समस्याओं का समाधान")}</span></div><div><b>{civic?.points??0}</b><span>{ui("Civic points","नागरिक अंक")}</span></div><div><b>{civic?.impact?.estimatedPeopleHelped??0}</b><span>{ui("Estimated people helped","अनुमानित लाभार्थी")}</span></div></div><div className="certificate-footer"><div><span className="certificate-signature">CiviX</span><small>{ui("CiviX Civic Engagement","CiviX नागरिक सहभागिता")}</small></div><div className="certificate-seal">CIVIX<br/><small>{ui("VERIFIED","सत्यापित")}</small></div><div><b>{new Date(c.issuedAt).toLocaleDateString()}</b><small>{ui("Date issued","जारी करने की तारीख")}</small></div></div><div className="certificate-id">{ui("Certificate ID","प्रमाणपत्र आईडी")}: {c.code}</div></div><button type="button" className="certificate-print-button" onClick={()=>{document.body.classList.add("printing-civix-certificate");window.print();window.setTimeout(()=>document.body.classList.remove("printing-civix-certificate"),1200)}}>⤓ {ui("Print / Save as PDF","प्रिंट / PDF के रूप में सहेजें")}</button></article>):<><article className="citizen-certificate certificate-preview"><div className="certificate-inner-border"><div className="certificate-topline"><span className="certificate-emblem">✦</span><span>CiviX · CONNECT. REPORT. RESOLVE.</span><span className="certificate-emblem">✦</span></div><div className="certificate-kicker">{ui("CERTIFICATE OF CIVIC CONTRIBUTION","नागरिक योगदान का प्रमाणपत्र")}</div><h3>{ui("Certificate of Appreciation","प्रशंसा प्रमाणपत्र")}</h3><p className="certificate-presented">{ui("This certificate will be presented to","यह प्रमाणपत्र प्रदान किया जाएगा")}</p><div className="certificate-recipient">{user.name}</div><p className="certificate-description">{ui("In recognition of meaningful civic participation and verified community impact.","सार्थक नागरिक भागीदारी और सत्यापित सामुदायिक योगदान के सम्मान में।")}</p><div className="certificate-metrics"><div><b>{civic?.resolvedReports??stats.resolved??0}</b><span>{ui("Issues resolved","समस्याओं का समाधान")}</span></div><div><b>{civic?.points??0}</b><span>{ui("Civic points","नागरिक अंक")}</span></div><div><b>{civic?.impact?.estimatedPeopleHelped??0}</b><span>{ui("Estimated people helped","अनुमानित लाभार्थी")}</span></div></div><div className="certificate-preview-stamp">{ui("PREVIEW · NOT YET ISSUED","पूर्वावलोकन · अभी जारी नहीं हुआ")}</div><div className="certificate-footer"><div><span className="certificate-signature">CiviX</span><small>{ui("CiviX Civic Engagement","CiviX नागरिक सहभागिता")}</small></div><div className="certificate-seal">CIVIX<br/><small>{ui("MILESTONE","उपलब्धि")}</small></div><div><b>—</b><small>{ui("Date issued","जारी करने की तारीख")}</small></div></div></div></article><p className="certificate-unlock-note">{ui("Resolve 5 verified reports to unlock an official civic impact certificate. This is only a preview.","आधिकारिक नागरिक योगदान प्रमाणपत्र पाने के लिए 5 सत्यापित शिकायतों का समाधान कराएँ। यह केवल पूर्वावलोकन है।")}</p></>}</section></Card> : <>
      <div className="profile-section-tabs" role="tablist" aria-label={ui("Profile sections","प्रोफ़ाइल अनुभाग")}>
        <button type="button" role="tab" aria-selected={profileSection==="grievances"} className={profileSection==="grievances"?"active":""} onClick={()=>setProfileSection("grievances")}>{ui("My Grievances","मेरी शिकायतें")}</button>
        <button type="button" role="tab" aria-selected={profileSection==="impact"} className={profileSection==="impact"?"active":""} onClick={()=>setProfileSection("impact")}>{ui("My Impact","मेरा प्रभाव")}</button>
      </div>
      {profileSection==="grievances" ? <section className="profile-grievances-section" role="tabpanel"><div className="profile-subsection-heading"><div><span className="eyebrow">{ui("MY GRIEVANCES","मेरी शिकायतें")}</span><h3>{ui("Your submitted civic issues","आपके द्वारा दर्ज की गई नागरिक शिकायतें")}</h3><p>{ui("Track progress and open any report for details.","प्रगति देखें और विवरण के लिए किसी भी शिकायत को खोलें।")}</p></div><Button variant="secondary" onClick={()=>go("grievances")}>View all</Button></div><MyGrievancePreview go={go}/></section> : <Card className="profile-impact-preview" role="tabpanel"><div className="card-title"><div><span className="eyebrow">MY IMPACT</span><h3>{ui("Your civic contribution","आपका नागरिक योगदान")}</h3><p>{ui("Your current milestone and the next badges you can unlock.","आपकी वर्तमान उपलब्धि और वे अगले बैज जिन्हें आप अनलॉक कर सकते हैं।")}</p></div><span className="profile-impact-points">⭐ {civic?.points??0} <small>points</small></span></div><div className="profile-current-badge"><span className="profile-current-badge-art">{getBadgeImage((civic?.badges??[]).find((b:any)=>b.earned))?<img src={getBadgeImage((civic?.badges??[]).find((b:any)=>b.earned))} alt="Current civic badge"/>:<Icon name="badge-check" size={24}/>}</span><div><span className="eyebrow">{ui("CURRENT BADGE","वर्तमान बैज")}</span><h4>{badgeHindiName((civic?.badges??[]).find((b:any)=>b.earned)?.name||civic?.currentBadge?.name||"Newbie")}</h4><p>{badgeHindiDescription((civic?.badges??[]).find((b:any)=>b.earned)?.description||civic?.currentBadge?.description||"Your CiviX journey starts here. Resolve your first verified report to earn the next badge.")}</p><span className="badge-status-earned">✓ {ui("Earned","अर्जित")}</span></div></div><div className="profile-upcoming-heading"><h4>{ui("Upcoming badges","आगामी बैज")}</h4><button type="button" onClick={()=>go("impact")}>{ui("View full Civic Impact","पूरा नागरिक प्रभाव देखें")} <Icon name="arrow" size={14}/></button></div><div className="profile-upcoming-badges">{(civic?.badges??[]).filter((b:any)=>!b.earned).slice(0,3).map((b:any)=><div className="profile-upcoming-badge" key={b.id}><span className="profile-upcoming-art">{getBadgeImage(b)?<img src={getBadgeImage(b)} alt=""/>:<Icon name={b.icon||"badge-check"} size={19}/>}</span><span><b>{badgeHindiName(b.name)}</b><small>{badgeHindiDescription(b.description)}</small><em>🔒 {ui("Upcoming","आगामी")}</em></span></div>)}{!(civic?.badges??[]).some((b:any)=>!b.earned)&&<p className="civic-no-badges">You have unlocked every available badge.</p>}</div></Card>}
    </>)}
    {!impactOnly && !isCitizen && <Card className="profile-workspace-note"><h3>{role==="officer"?"Officer workspace":"Administration workspace"}</h3><p>{role==="officer"?"Use the Grievances, Priority Queue, SLA Monitor and GIS Map tabs to review and act on assigned cases.":"Use Users & Officers, AI Review, Departments, Analytics and Audit Logs to manage CiviX operations."}</p><Button variant="secondary" onClick={()=>go(role==="officer"?"incidents":"users")}>{role==="officer"?"Open assigned grievances":"Open administration"}</Button></Card>}
  </div>;
}

function MyGrievancePreview({go}:{go:(s:Screen)=>void}){const [items,setItems]=useState<Grievance[]>([]);useEffect(()=>{api.grievances.list(new URLSearchParams({mine:"true",page:"1",limit:"4"})).then(r=>setItems(r.items))},[]);return items.map(g=><IssueCard key={g.grievanceId} go={go} grievance={g} compact/>);}

function OfficerDashboard({ go, location }: { go:(s:Screen)=>void; location:LocationState }) {
 const [dash,setDash]=useState<any>(null); const [items,setItems]=useState<Grievance[]>([]); useEffect(()=>{api.officerDashboard().then(setDash).catch(()=>{});const p=new URLSearchParams({assignedTo:"me",page:"1",limit:"6",sort:"impact"});api.officerIncidents(p).then(r=>setItems(r.items)).catch(()=>{})},[]);
 const critical=dash?.critical??0, pending=dash?.pending??0, inProgress=dash?.inProgress??0, resolved=dash?.resolved??0; return <div className="page ops-page"><div className="page-heading"><div><span className="eyebrow">LIVE OPERATIONS</span><h1>Operations overview</h1><p>Assigned incidents and live service status.</p></div><Button icon="map" onClick={()=>go("map")}>Open GIS Map</Button></div><div className="metric-grid"><Metric label="Critical" value={String(critical)} detail="Assigned" tone="metric-red"/><Metric label="Pending" value={String(pending)} detail="Needs acknowledgement"/><Metric label="In progress" value={String(inProgress)} detail="Assigned to you"/><Metric label="Resolved" value={String(resolved)} detail="Current total" tone="metric-green"/></div><div className="ops-grid"><Card className="priority-table"><div className="card-title"><div><h3>Priority queue</h3><p>Live assigned grievances</p></div><Button variant="ghost" onClick={()=>go("incidents")}>View all</Button></div><div className="table-head"><span>Incident</span><span>Severity</span><span>Impact</span><span>Status</span></div>{items.length?items.slice(0,5).map(g=><button className="table-row" key={g.grievanceId} onClick={()=>{localStorage.setItem("civix_selected_grievance",String(g._id||g.grievanceId));go("incident")}}><span><b>{g.grievanceId}</b><small>{g.text.slice(0,45)}</small></span><span><Status tone={g.severity==="critical"?"red":g.severity==="high"?"orange":"sky"}>{g.severity||"—"}</Status></span><span><b>{g.impactScore??0}</b>/100</span><span>{g.status.replace(/_/g," ")} <Icon name="arrow" size={16}/></span></button>):<div className="empty-state">No grievances assigned to you.</div>}</Card><Card className="ops-map"><div className="card-title"><div><h3>Live incident map</h3><p>{items.length} assigned incidents</p></div><button onClick={()=>go("map")}><Icon name="arrow"/></button></div><CityMap location={location} onMarker={id=>{if(id)localStorage.setItem("civix_selected_grievance",id);go("incident")}}/></Card></div></div>;
}

function Incidents({ go, filterStatus }: { go:(s:Screen)=>void; filterStatus?:string }) {
 const [items,setItems]=useState<Grievance[]>([]);const [q,setQ]=useState("");useEffect(()=>{const p=new URLSearchParams({assignedTo:"me",page:"1",limit:"100"});if(filterStatus)p.set("status",filterStatus);if(q)p.set("search",q);api.officerIncidents(p).then(r=>setItems(r.items)).catch(()=>setItems([]))},[q,filterStatus]); const isAcknowledge=filterStatus==="ASSIGNED"; return <div className="page ops-page"><div className="page-heading"><div><span className="eyebrow">INCIDENT MANAGEMENT</span><h1>{isAcknowledge?"Acknowledge grievances":filterStatus==="RESOLVED"?"Resolved grievances":filterStatus?"SLA monitor":"All grievances"}</h1><p>{isAcknowledge?"Assigned grievances waiting for officer acknowledgement.":`${items.length} assigned incidents loaded from backend.`}</p></div></div><Card className="filterbar"><div className="search"><Icon name="search"/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search by ID, issue or location"/></div></Card><Card className="data-table"><div className="table-head"><span>Incident</span><span>Category</span><span>Severity</span><span>Impact</span><span>SLA</span><span>Status</span></div>{items.map(g=><button className="table-row" key={g.grievanceId} onClick={()=>{localStorage.setItem("civix_selected_grievance",String(g._id||g.grievanceId));go("incident")}}><span><b>{g.grievanceId}</b><small>{g.text.slice(0,50)}</small></span><span>{g.category||"—"}</span><span><Status tone={g.severity==="critical"?"red":g.severity==="high"?"orange":"sky"}>{g.severity||"—"}</Status></span><span>{g.impactScore??0}/100</span><span>{g.slaDeadline?new Date(g.slaDeadline).toLocaleString():"—"}</span><span>{g.status.replace(/_/g," ")} <Icon name="arrow" size={15}/></span></button>)}</Card></div>;
}

function Incident({ go, location, user }: { go:(s:Screen)=>void; location:LocationState; user:User }) {
 const [g,setG]=useState<Grievance|null>(null); const [busy,setBusy]=useState(false); const [officers,setOfficers]=useState<any[]>([]); const [selectedOfficer,setSelectedOfficer]=useState(""); const [message,setMessage]=useState("");
 const [pocName,setPocName]=useState("Rahul Sharma"); const [pocDesignation,setPocDesignation]=useState("Grievance Officer"); const [pocDepartment,setPocDepartment]=useState("Municipal Corporation"); const [pocContact,setPocContact]=useState("9000000000"); const [pocHours,setPocHours]=useState("Monday–Friday, 10 AM–5 PM"); const [pocIsDemo,setPocIsDemo]=useState(true);
 useEffect(()=>{const id=localStorage.getItem("civix_selected_grievance");if(id)api.grievances.get(id).then(item=>{setG(item);if(item.poc){setPocName(item.poc.name||"");setPocDesignation(item.poc.designation||"");setPocDepartment(item.poc.department||"");setPocContact(item.poc.officialContact||"");setPocHours(item.poc.officeHours||"");setPocIsDemo(Boolean(item.poc.isDemo));}}).catch(()=>{});if(user.role==="admin")api.admin.governmentAccounts().then(r=>setOfficers(r.officers||[])).catch(()=>{})},[user.role]);
 if(!g)return <div className="page"><Card><div className="empty-state">Select an incident from the queue.</div></Card></div>;
 const update=async(status:string)=>{setBusy(true);try{const x=await api.grievances.updateStatus(String(g._id),status);setG(x)}catch(e){setMessage(e instanceof Error?e.message:"Unable to update status")}finally{setBusy(false)}};
 const assign=async()=>{if(!selectedOfficer)return;setBusy(true);try{const x=await api.admin.assignGrievance(String(g._id),{officerId:selectedOfficer});setG(x);setMessage("Grievance assigned successfully.")}catch(e){setMessage(e instanceof Error?e.message:"Assignment failed")}finally{setBusy(false)}};
 const verify=async(decision:"approve"|"reopen")=>{setBusy(true);try{const x=await api.grievances.verify(String(g._id),decision);setG(x);setMessage(decision==="approve"?"Resolution verified and grievance closed.":"Grievance reopened for further action.")}catch(e){setMessage(e instanceof Error?e.message:"Verification failed")}finally{setBusy(false)}};
 const savePoc=async()=>{if(!g._id)return;setBusy(true);setMessage("");try{const x=await api.grievances.assignPoc(String(g._id),{name:pocName.trim(),designation:pocDesignation.trim(),department:pocDepartment.trim(),officialContact:pocContact.trim(),officeHours:pocHours.trim(),isDemo:pocIsDemo});setG(x);setMessage("Person of Contact saved to this grievance. WhatsApp delivery will be connected through OpenClaw next.")}catch(e){setMessage(e instanceof Error?e.message:"Unable to save Person of Contact")}finally{setBusy(false)}};
 const officer=typeof g.officerId==='object'?g.officerId:null;
 return <div className="page ops-page"><button className="back-link" onClick={()=>go(user.role==="citizen"?"feed":"dashboard")}>← Back</button><div className="incident-command"><div><div className="detail-tags"><Status tone={g.severity==="critical"?"red":"orange"}>{g.severity||"Unrated"}</Status><Status tone="sky">{g.status.replace(/_/g," ")}</Status><span>{g.grievanceId}</span></div><h1>{(g.title||g.text).slice(0,120)}</h1><p><Icon name="pin" size={16}/> {g.location?.coordinates?.join(", ")}</p></div><div><div className="sla-count"><Icon name="clock"/><span>SLA deadline<b>{g.slaDeadline?new Date(g.slaDeadline).toLocaleString():"Not configured"}</b></span></div>{user.role==="officer"&&g.status==="ASSIGNED"&&<Button variant="accent" disabled={busy} onClick={()=>update("ACKNOWLEDGED")}>{busy?"Acknowledging…":"Acknowledge & Start Work"}</Button>}{user.role==="officer"&&g.status==="IN_PROGRESS"&&<Button variant="accent" onClick={()=>go("resolution")}>Submit Resolution</Button>}{user.role==="citizen"&&g.status==="VERIFICATION"&&<div className="verify-actions"><Button variant="accent" disabled={busy} onClick={()=>verify("approve")}>Verify Resolution</Button><Button variant="secondary" disabled={busy} onClick={()=>verify("reopen")}>Issue Still Exists</Button></div>}</div></div><div className="incident-grid"><main><Card className="ops-map-detail"><CityMap location={location}/></Card><Card><h3>Citizen evidence</h3><div className="evidence-strip">{g.media?.map((m,i)=>m.type==="image"?<img key={i} src={m.url} alt="Citizen evidence"/>:m.type==="video"?<video key={i} src={m.url} controls className="evidence-video"/>:<audio key={i} src={m.url} controls/>)}</div><p>{g.summary||g.text}</p></Card><Card><div className="card-title"><div><h3>Government workflow</h3><p>Role-based status progression</p></div></div><div className="workflow-flow">{["SUBMITTED","AI_PROCESSED","ASSIGNED","ACKNOWLEDGED","IN_PROGRESS","RESOLUTION_SUBMITTED","VERIFICATION","RESOLVED"].map((x,i)=><div className={g.status===x?"current":(["SUBMITTED","AI_PROCESSED","ASSIGNED","ACKNOWLEDGED","IN_PROGRESS","RESOLUTION_SUBMITTED","VERIFICATION","RESOLVED"].indexOf(g.status)>=i?"done":"")} key={x}><span>{i+1}</span><b>{x.replace(/_/g," ")}</b>{i<7&&<i>→</i>}</div>)}</div></Card><Card><div className="card-title"><div><h3>AI intelligence</h3><p>Analysis stored on this grievance</p></div><Status tone="sky">{g.aiConfidence?`${Math.round(((g.aiConfidence.category||0)+(g.aiConfidence.severity||0)+(g.aiConfidence.impact||0))/3*100)}% confidence`:"—"}</Status></div><div className="stat-list"><span>Category <b>{g.category||"—"}</b></span><span>Impact <b>{g.impactScore??0}/100</b></span><span>Emergency <b>{g.isEmergency?"Yes":"No"}</b></span><span>Review <b>{g.aiHumanReview?"Required":"Cleared"}</b></span></div></Card></main><aside><Card><h3>Assignment</h3>{user.role==="admin"?<><select className="assignment-select" value={selectedOfficer} onChange={e=>setSelectedOfficer(e.target.value)}><option value="">Select officer</option>{officers.map(o=><option key={o._id} value={o._id}>{o.userId?.name||"Officer"} · {o.userId?.governmentId||"No ID"}</option>)}</select><Button variant="accent" disabled={!selectedOfficer||busy} onClick={assign}>Assign Officer</Button></>:officer?<div className="officer"><Avatar initials={getInitials(officer.userId?.name||"Officer")} src={officer.userId?.profileImage} useDefault/><div><b>{officer.userId?.name||"Officer"}</b><small>{officer.team||"Field Officer"}</small></div></div>:<p>Assignment pending.</p>}<p>{g.departments?.join(", ")||"—"}</p></Card>{user.role==="officer"&&<Card className="poc-assignment-card"><div className="card-title"><div><h3>Point of Contact (POC)</h3><p>Enter the contact the citizen should reach for this grievance.</p></div></div><label className="field"><span>POC name</span><input value={pocName} onChange={e=>{setPocName(e.target.value);setPocIsDemo(false)}} placeholder="Enter POC name"/></label><label className="field"><span>Designation</span><input value={pocDesignation} onChange={e=>{setPocDesignation(e.target.value);setPocIsDemo(false)}} placeholder="e.g. Grievance Officer"/></label><label className="field"><span>Department</span><input value={pocDepartment} onChange={e=>{setPocDepartment(e.target.value);setPocIsDemo(false)}} placeholder="Department name"/></label><label className="field"><span>Official contact number</span><input value={pocContact} onChange={e=>{setPocContact(e.target.value);setPocIsDemo(false)}} placeholder="Enter official contact number"/></label><label className="field"><span>Office hours</span><input value={pocHours} onChange={e=>{setPocHours(e.target.value);setPocIsDemo(false)}} placeholder="e.g. Mon–Fri, 10 AM–5 PM"/></label><Button variant="accent" disabled={busy||!pocName.trim()||!pocDesignation.trim()||!pocDepartment.trim()||!pocContact.trim()} onClick={savePoc}>{busy?"Saving…":g.poc?"Update POC":"Save POC"}</Button></Card>}{g.poc&&<Card className="poc-display-card"><h3>Assigned Point of Contact</h3><div className="poc-contact-details"><b>{g.poc.name}</b><span>{g.poc.designation}</span><span>{g.poc.department}</span><span>☎ {g.poc.officialContact}</span><span>Office hours: {g.poc.officeHours||"Not specified"}</span></div></Card>}<Card><h3>Impact intelligence</h3><div className="impact"><strong>{g.impactScore??0}</strong><span>/100<br/>{g.severity||"Unrated"}</span></div><div className="stat-list"><span>Community supports <b>{g.upvoteCount||0}</b></span><span>Comments <b>{g.commentCount||0}</b></span><span>Evidence <b>{g.media?.length||0}</b></span></div></Card></aside></div>{message&&<p className="workflow-message">{message}</p>}</div>;
}

function Resolution({ go, location }: { go:(s:Screen)=>void; location:LocationState }) {
 const [g,setG]=useState<Grievance|null>(null);
 const [desc,setDesc]=useState("");
 const [after,setAfter]=useState<File|null>(null);
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState("");
 useEffect(()=>{const id=localStorage.getItem("civix_selected_grievance");if(id)api.grievances.get(id).then(setG).catch(()=>{})},[]);
 if(!g)return <div className="page"><Card><div className="empty-state">No incident selected.</div></Card></div>;

 const submitDescription=async()=>{
   if(!desc.trim())return;
   setBusy(true);setMessage("");
   try{
     const result=await api.grievances.resolution(String(g._id),{resolutionDescription:desc.trim()});
     setG(result.grievance);
     setMessage("Resolution description submitted. Now upload the final photo evidence.");
   }catch(e){setMessage(e instanceof Error?e.message:"Resolution submission failed")}
   finally{setBusy(false)}
 };

 const submitPhoto=async()=>{
   if(!after)return;
   setBusy(true);setMessage("");
   try{
     const uploaded=(await api.upload([after])).items[0]?.url||"";
     if(!uploaded)throw new Error("Photo upload failed.");
     const result=await api.grievances.finalizeResolution(String(g._id),{
       afterUrl:uploaded,
       latitude:location?.latitude,
       longitude:location?.longitude,
     });
     setG(result.grievance);
     setMessage("Final photo submitted. The grievance is now resolved.");
   }catch(e){setMessage(e instanceof Error?e.message:"Final photo submission failed")}
   finally{setBusy(false)}
 };

 const resolutionSubmitted=g.status==="RESOLUTION_SUBMITTED";
 const resolved=g.status==="RESOLVED";

 if(resolved)return <div className="success-page ops-success"><Logo/><Card><div className="success-icon"><Icon name="check" size={32}/></div><h1>Grievance resolved</h1><p>The officer submitted the resolution description and final photo evidence.</p>{["Resolution description submitted","Final photo evidence uploaded","Status moved to RESOLVED","Citizen notification sent"].map(x=><div className="verify-line" key={x}><Icon name="check" size={16}/>{x}</div>)}<Button onClick={()=>go("incident")}>Return to incident</Button></Card></div>;

 return <div className="page ops-page resolution-page">
   <button className="back-link" onClick={()=>go("incident")}>← Back to {g.grievanceId}</button>
   <div className="page-heading"><div><span className="eyebrow">RESOLUTION WORKFLOW</span><h1>{resolutionSubmitted?"Submit final photo evidence":"Submit resolution description"}</h1><p>{resolutionSubmitted?"The written resolution is recorded. Upload the final work photo to close the grievance.":"Describe what your department did to resolve the grievance."}</p></div><Status tone="blue">{g.status.replace(/_/g," ")}</Status></div>
   <div className="resolution-grid">
     <main>
       {resolutionSubmitted ? <Card><h3>Final resolution photo</h3><label className="resolution-photo-upload"><Icon name="camera" size={28}/><b>{after?"Photo selected":"Upload completed-work photo"}</b><small>This photo is required before the grievance can be marked resolved.</small><input type="file" accept="image/*" hidden onChange={e=>setAfter(e.target.files?.[0]||null)}/>{after&&<span>{after.name}</span>}</label></Card>
       : <Card><label className="field textarea"><span>Resolution description</span><textarea value={desc} onChange={e=>setDesc(e.target.value)} placeholder="Describe the work completed by your department…"/></label></Card>}
       {message&&<Card><p className="muted">{message}</p></Card>}
     </main>
     <aside>
       <Card><h3>Workflow</h3>{[
         ["1","Acknowledged & work started",g.acknowledgedAt?"Completed":"Pending"],
         ["2","Resolution description",resolutionSubmitted||resolved?"Completed":"Pending"],
         ["3","Final photo evidence",resolved?"Completed":resolutionSubmitted?"Pending":"Locked"],
         ["4","Resolved",resolved?"Completed":"Pending"],
       ].map(x=><div className="verify-item" key={x[0]}><span><b>{x[0]}</b></span><div><b>{x[1]}</b><small>{x[2]}</small></div></div>)}</Card>
       <Card className="submit-card"><h3>{resolutionSubmitted?"Ready to close?":"Ready to submit?"}</h3><p>{resolutionSubmitted?"Upload the completed-work photo. The grievance will be marked resolved immediately.":"Submit only the department's actual work/resolution description."}</p>{resolutionSubmitted?<Button variant="accent" disabled={!after||busy} onClick={submitPhoto}>{busy?"Uploading…":"Upload Photo & Resolve"}</Button>:<Button variant="accent" disabled={!desc.trim()||busy} onClick={submitDescription}>{busy?"Submitting…":"Submit Resolution Description"}</Button>}</Card>
     </aside>
   </div>
 </div>;
}

function GISMap({ go, location }: { go:(s:Screen)=>void; location:LocationState }) {
 const [items,setItems]=useState<any[]>([]);const [severity,setSeverity]=useState("");useEffect(()=>{const p=new URLSearchParams();if(location){p.set("lat",String(location.latitude));p.set("lng",String(location.longitude));p.set("radius","20000")}if(severity)p.set("status",severity);api.map(p).then(setItems).catch(()=>setItems([]))},[location?.latitude,location?.longitude,severity]);const selected=items[0];return <div className="gis-page"><div className="gis-bar"><div><span className="eyebrow">CIVIC GIS INTELLIGENCE</span><h1>Live incident map</h1></div><div className="gis-filters"><button onClick={()=>setSeverity("")}>All incidents</button><button onClick={()=>setSeverity("IN_PROGRESS")}>In progress</button><button onClick={()=>setSeverity("RESOLVED")}>Resolved</button></div></div><div className="gis-canvas"><CityMap location={location} onMarker={id=>{if(id){localStorage.setItem("civix_selected_grievance",id);go("incident")}}}/>{selected&&<Card className="map-incident"><Status tone="orange">{selected.severity||"Unrated"} · {selected.impactScore??0} impact</Status><h3>{selected.grievanceId}</h3><p>{selected.category||"Uncategorized"} · {selected.status}</p><div><span><Icon name="clock" size={15}/> {selected.slaDeadline?new Date(selected.slaDeadline).toLocaleString():"No SLA"}</span><b>{selected.upvoteCount||0} supports</b></div><Button onClick={()=>{localStorage.setItem("civix_selected_grievance",String(selected._id||selected.grievanceId));go("incident")}}>Open incident <Icon name="arrow" size={15}/></Button></Card>}</div></div>;
}

function AdminDashboard({ go }: { go:(s:Screen)=>void }) {
 const [d,setD]=useState<any>(null);useEffect(()=>{api.admin.overview().then(setD).catch(()=>{})},[]);if(!d)return <div className="page"><Card><div className="empty-state">Loading live operations…</div></Card></div>;return <div className="page ops-page"><div className="page-heading"><div><span className="eyebrow">SYSTEM ADMINISTRATION</span><h1>City operations</h1><p>City workload, service performance and administrative attention queue.</p></div><div style={{display:"flex",gap:"8px"}}><Button variant="secondary" icon="chart" onClick={()=>go("analytics")}>Analytics</Button><Button variant="ghost" onClick={()=>downloadJson("civix-overview.json",d)}>Export data</Button></div></div><div className="metric-grid admin-metrics"><Metric label="Total users" value={String(d.users.total)} detail="Active accounts"/><Metric label="Active grievances" value={String(d.grievances.active)} detail={`${d.grievances.total} total`}/><Metric label="Officers online" value={String(d.officers.active)} detail="Active officer profiles"/><Metric label="SLA compliance" value={`${d.sla.compliance}%`} detail="Calculated from stored SLA data" tone="metric-green"/><Metric label="AI review queue" value={String(d.ai.reviewQueue)} detail="Needs human review" tone="metric-orange"/></div><div className="admin-grid"><Card className="chart-card"><div className="card-title"><div><h3>Resolution performance</h3><p>Real grievance volume from the last 12 days</p></div></div><div className="bar-chart">{d.daily.map((x:any,i:number)=><div key={x._id} title={`${x._id}: ${x.received} received, ${x.resolved} resolved`}><i style={{height:`${Math.min(100,x.received*10)}%`}}/><i style={{height:`${Math.min(100,x.resolved*10)}%`}}/></div>)}</div><div className="chart-legend"><span><i/>Received</span><span><i/>Resolved</span></div></Card><Card><div className="card-title"><div><h3>City attention queue</h3><p>Operational issues that need an administrator's attention.</p></div></div><div className="stat-list"><span>Active grievances <b>{d.grievances.active}</b></span><span>AI review queue <b>{d.ai.reviewQueue}</b></span><span>SLA breaches <b className={d.sla.breached?"danger-text":""}>{d.sla.breached}</b></span><span>Active officers <b>{d.officers.active}</b></span></div><button className="attention-row" onClick={()=>go("ai-review")}><div><b>Review AI decisions</b><small>Correct classification or routing</small></div><strong>{d.ai.reviewQueue}</strong><Icon name="arrow" size={16}/></button><button className="attention-row" onClick={()=>go("departments")}><div><b>Review department workload</b><small>Open department registry</small></div><Icon name="arrow" size={16}/></button></Card><Card className="department-table"><div className="card-title"><div><h3>Department performance</h3><p>Calculated from grievances</p></div><Button variant="ghost" onClick={()=>go("analytics")}>Full analytics</Button></div>{d.departmentPerformance.map((x:any)=><div className="department-row" key={x.id}><b>{x.name}</b><span>{x.cases} cases</span><span>{x.resolutionRate}% resolved</span><span>{x.resolved} closed</span></div>)}</Card></div></div>;
}

function AIReview({ go }: { go:(s:Screen)=>void }) {
 const [items,setItems]=useState<Grievance[]>([]);const [selected,setSelected]=useState<Grievance|null>(null);const [message,setMessage]=useState("");const [officers,setOfficers]=useState<any[]>([]);const [routing,setRouting]=useState(false);
 const load=()=>api.admin.aiReview().then(r=>{setItems(r.items);setSelected(x=>x&&r.items.find((g:Grievance)=>g._id===x._id)||r.items[0]||null)});
 useEffect(()=>{load();api.admin.governmentAccounts().then(r=>setOfficers(r.officers||[])).catch(()=>{})},[]);
 const decide=async(decision:string)=>{if(!selected?._id)return;try{await api.admin.decideAI(String(selected._id),decision);setMessage(`AI decision ${decision} recorded.`);await load()}catch(e){setMessage(e instanceof Error?e.message:"Decision failed")}};
 const reassign=async(officerId:string)=>{if(!selected?._id||!officerId)return;const officer=officers.find(o=>String(o._id)===String(officerId));const departmentId=officer?.departmentIds?.[0]?._id;setRouting(true);try{await api.admin.assignGrievance(String(selected._id),{officerId,departmentId});setMessage(`Routing overridden. ${selected.grievanceId} is now assigned to ${officer?.userId?.name||"the selected officer"}.`);const refreshed=await api.grievances.get(String(selected._id));setSelected(refreshed);setItems(x=>x.map(g=>g._id===refreshed._id?refreshed:g))}catch(e){setMessage(e instanceof Error?e.message:"Routing update failed")}finally{setRouting(false)}};
 const currentOfficer=selected?.officerId&&typeof selected.officerId!=="string"?selected.officerId:null;
 return <div className="page ops-page"><div className="page-heading"><div><span className="eyebrow">HUMAN-IN-THE-LOOP</span><h1>AI decision review</h1><p>AI routes grievances immediately. Administrators can review AI confidence and correct the routing without blocking officer work.</p></div><Status tone="orange">{items.length} awaiting review</Status></div>{message&&<div className="toast"><Icon name="check"/><b>Update recorded</b><span>{message}</span></div>}<div className="review-layout"><Card className="review-queue"><h3>Review queue</h3>{items.map(x=><button className={selected?._id===x._id?"active":""} key={x._id} onClick={()=>setSelected(x)}><span><b>{x.grievanceId}</b><small>{x.text.slice(0,35)}</small></span><div><Status tone={x.severity==="critical"?"red":"orange"}>{x.severity||"—"}</Status><small>{x.aiConfidence?`${Math.round(((x.aiConfidence.category||0)+(x.aiConfidence.severity||0)+(x.aiConfidence.impact||0))/3*100)}% confidence`:"—"}</small></div></button>)}</Card><main>{selected?<><Card><div className="card-title"><div><span className="eyebrow">{selected.grievanceId}</span><h2>{selected.text.slice(0,120)}</h2></div><Status tone={selected.aiHumanReview?"orange":"green"}>{selected.aiHumanReview?"Human review required":"AI cleared"}</Status></div><p className="review-text">{selected.text}</p><div className="explain-grid">{[["Detected category",selected.category||"—",`${Math.round((selected.aiConfidence?.category||0)*100)}% confidence`],["Suggested severity",selected.severity||"—",`${Math.round((selected.aiConfidence?.severity||0)*100)}% confidence`],["Impact score",`${selected.impactScore??0}/100`,"Community and AI score"],["Suggested department",selected.departments?.join(", ")||"—","AI routing"],["Current department",typeof selected.departmentId==="object"?selected.departmentId?.name||selected.departmentId?.code||"—":"—","Current assignment"],["Review reasons",selected.aiReviewReasons?.join(", ")||"None","Stored by AI pipeline"]].map(x=><div key={x[0]}><span>{x[0]}</span><b>{x[1]}</b><small>{x[2]}</small></div>)}</div></Card><Card className="routing-card"><div className="card-title"><div><h3>Officer routing</h3><p>Automatic AI routing is already active. Use this control only when the assignment is incorrect.</p></div><Status tone={currentOfficer?"green":"orange"}>{currentOfficer?.userId?.name||"Unassigned"}</Status></div><div className="routing-control"><label className="field"><span>Swap to officer</span><select value={currentOfficer?._id||""} onChange={e=>reassign(e.target.value)} disabled={routing}><option value="">Select an active officer…</option>{officers.map((o:any)=><option key={o._id} value={o._id}>{o.userId?.name||"Officer"} — {(o.departmentIds||[]).map((d:any)=>d.name||d.code).join(", ")}</option>)}</select></label><small>{routing?"Updating assignment…":"Changing this assignment creates an audit event and notifies the affected officers and citizen."}</small></div></Card><div className="decision-actions"><Button variant="secondary" onClick={()=>decide("reject")}>Reject AI result</Button><Button variant="secondary" onClick={()=>decide("merge")}>Merge duplicate</Button><Button variant="secondary" onClick={()=>decide("override")}>Override AI result</Button><Button onClick={()=>decide("approve")}>Approve AI result</Button></div></>:<Card><div className="empty-state">No AI reviews awaiting action.</div></Card>}</main></div></div>;
}
function AdminDirectory({ mode }: { mode:"users"|"departments" }) {
 const [data,setData]=useState<any[]>([]); const [departments,setDepartments]=useState<any[]>([]); const [search,setSearch]=useState(""); const [showCreate,setShowCreate]=useState(false); const [form,setForm]=useState({name:"",email:"",password:"",governmentId:"",role:"officer",employeeId:"",departmentId:""}); const [message,setMessage]=useState("");
 const load=()=>{if(mode==="users")api.admin.users(search).then(r=>setData(r.users||[]));else api.admin.departments().then(setData).catch(()=>setData([]))}; useEffect(load,[mode,search]);
 useEffect(()=>{if(mode==="users")api.admin.departments().then(setDepartments).catch(()=>{})},[mode]);
 const createGov=async()=>{try{const payload={...form,departmentIds:form.departmentId?[form.departmentId]:[]};const r=await api.admin.createGovernmentAccount(payload);setMessage(`${r.user.role.toUpperCase()} created with Government ID ${r.user.governmentId}`);setForm({name:"",email:"",password:"",governmentId:"",role:"officer",employeeId:"",departmentId:""});setShowCreate(false);load()}catch(e){setMessage(e instanceof Error?e.message:"Unable to create government account")}};
 return <div className="page ops-page"><div className="page-heading"><div><span className="eyebrow">SYSTEM ADMINISTRATION</span><h1>{mode==="users"?"Users & Government Accounts":"Departments"}</h1><p>{mode==="users"?"Manage citizen and government identities, including officer department coverage.":"Department registry, workload and active routing coverage."}</p></div>{mode==="users"&&<Button variant="accent" onClick={()=>setShowCreate(x=>!x)}>+ Create Government Account</Button>}</div>{message&&<div className="quick-status"><div><Icon name="check"/><div><b>{message}</b></div></div></div>}{showCreate&&<Card className="gov-account-form"><div className="card-title"><div><h3>Create government account</h3><p>Officer accounts must be linked to a department so AI routing can reach them.</p></div></div><div className="form-grid"><Field label="Full name" value={form.name} onChange={v=>setForm({...form,name:v})}/><Field label="Email" value={form.email} onChange={v=>setForm({...form,email:v})}/><Field label="Government ID (optional)" placeholder="Auto-generated if blank" value={form.governmentId} onChange={v=>setForm({...form,governmentId:v})}/><Field label="Temporary password" type="password" value={form.password} onChange={v=>setForm({...form,password:v})}/><Field label="Employee ID" value={form.employeeId} onChange={v=>setForm({...form,employeeId:v})}/><label className="field"><span>Role</span><select value={form.role} onChange={e=>setForm({...form,role:e.target.value})}><option value="officer">Officer</option><option value="admin">Admin</option></select></label>{form.role==="officer"&&<label className="field"><span>Department</span><select value={form.departmentId} onChange={e=>setForm({...form,departmentId:e.target.value})}><option value="">Select department…</option>{departments.map((d:any)=><option key={d._id} value={d._id}>{d.name}</option>)}</select></label>}</div><div className="report-actions"><Button variant="ghost" onClick={()=>setShowCreate(false)}>Cancel</Button><Button variant="accent" onClick={createGov}>Create account</Button></div></Card>}{mode==="users"&&<Card className="filterbar"><div className="search"><Icon name="search"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search users"/></div></Card>}<Card className="data-table"><div className="table-head">{mode==="users"?<><span>User</span><span>Email</span><span>Role</span><span>Government ID</span><span>Verified</span><span>Created</span></>:<><span>Department</span><span>Code</span><span>Active</span><span>Open cases</span><span>Total cases</span></>}</div>{data.length?data.map((x:any)=><div className="table-row" key={String(x._id)}>{mode==="users"?<><span><b>{x.name}</b><small>@{x.username}</small></span><span>{x.email}</span><span>{x.role}</span><span>{x.governmentId||"—"}</span><span>{x.emailVerified?"Yes":"No"}</span><span>{new Date(x.createdAt).toLocaleDateString()}</span></>:<><span><b>{x.name}</b></span><span>{x.code}</span><span>{x.active?"Active":"Inactive"}</span><span>{x.activeGrievances}</span><span>{x.totalGrievances}</span></>}</div>):<div className="empty-state">No records found.</div>}</Card></div>;
}
function SLAConfiguration() {
  type SLAItem = { _id:string; severity:string; departmentId?: { _id?:string; name?:string; code?:string } | string | null; hours:number; active:boolean };
  const [items,setItems] = useState<SLAItem[]>([]);
  const [departments,setDepartments] = useState<any[]>([]);
  const [severity,setSeverity] = useState("medium");
  const [departmentId,setDepartmentId] = useState("");
  const [hours,setHours] = useState("24");
  const [loading,setLoading] = useState(true);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState("");
  const [message,setMessage] = useState("");
  const load = () => { setLoading(true); api.admin.slaConfigs().then((r:any)=>{setItems(r.items||[]);setDepartments(r.departments||[])}).catch((e:any)=>setError(e.message||"Could not load SLA configuration")).finally(()=>setLoading(false)); };
  useEffect(()=>{load()},[]);
  const save = async () => {
    const parsedHours=Number(hours);
    if(!Number.isInteger(parsedHours)||parsedHours<1||parsedHours>8760){setError("Enter a whole number of hours between 1 and 8760.");return;}
    setBusy(true);setError("");setMessage("");
    try { await api.admin.createSlaConfig({severity,departmentId:departmentId||null,hours:parsedHours,active:true}); setMessage("SLA rule created."); setHours("24"); load(); }
    catch(e:any){setError(e.message||"Could not save SLA rule");} finally {setBusy(false)}
  };
  const toggle = async (item:SLAItem) => {setBusy(true);setError("");try{await api.admin.updateSlaConfig(item._id,{active:!item.active});setItems(old=>old.map(x=>x._id===item._id?{...x,active:!x.active}:x));setMessage(`Rule ${item.active?"disabled":"enabled"}.`)}catch(e:any){setError(e.message||"Could not update rule")}finally{setBusy(false)}};
  const editHours = async (item:SLAItem) => {const value=window.prompt(`Set SLA hours for ${item.severity} (${item.departmentId && typeof item.departmentId==='object'?item.departmentId.name:"Global default"})`,String(item.hours));if(value===null)return;const parsed=Number(value);if(!Number.isInteger(parsed)||parsed<1||parsed>8760){setError("Enter a whole number of hours between 1 and 8760.");return;}setBusy(true);setError("");try{await api.admin.updateSlaConfig(item._id,{hours:parsed});setItems(old=>old.map(x=>x._id===item._id?{...x,hours:parsed}:x));setMessage("SLA duration updated.")}catch(e:any){setError(e.message||"Could not update rule")}finally{setBusy(false)}};
  const scopeLabel=(item:SLAItem)=>item.departmentId&&typeof item.departmentId==="object"?`${item.departmentId.name||"Department"} (${item.departmentId.code||""})`:"Global default";
  return <div className="page ops-page"><div className="page-heading"><div><span className="eyebrow">SERVICE LEVEL MANAGEMENT</span><h1>SLA Configuration</h1><p>Configure response and resolution deadlines by severity, with optional department-specific overrides.</p></div></div><Card><div className="card-title"><div><h3>Create SLA rule</h3><p>Department rules override global defaults for new grievances.</p></div></div><div className="form-grid"><label>Severity<select value={severity} onChange={e=>setSeverity(e.target.value)}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select></label><label>Department<select value={departmentId} onChange={e=>setDepartmentId(e.target.value)}><option value="">Global default</option>{departments.map(d=><option value={d._id} key={d._id}>{d.name} ({d.code})</option>)}</select></label><label>Deadline (hours)<input type="number" min="1" max="8760" step="1" value={hours} onChange={e=>setHours(e.target.value)}/></label><div className="report-actions"><Button variant="accent" disabled={busy} onClick={save}>{busy?"Saving…":"Add SLA rule"}</Button></div></div>{error&&<p className="workflow-message danger-text">{error}</p>}{message&&<p className="workflow-message">{message}</p>}</Card><Card className="data-table"><div className="card-title"><div><h3>Configured rules</h3><p>Changes apply when SLA deadlines are assigned to new or reprocessed grievances; existing deadlines are not automatically rewritten.</p></div></div><div className="table-head"><span>Severity</span><span>Department scope</span><span>Deadline</span><span>Status</span><span>Actions</span></div>{loading?<div className="empty-state">Loading SLA rules…</div>:items.length?items.map(item=><div className="table-row" key={item._id}><span><b>{item.severity.toUpperCase()}</b></span><span>{scopeLabel(item)}</span><span>{item.hours} hours</span><span><Status tone={item.active?"green":"red"}>{item.active?"Active":"Disabled"}</Status></span><span className="report-actions"><Button variant="secondary" disabled={busy} onClick={()=>editHours(item)}>Edit hours</Button><Button variant="ghost" disabled={busy} onClick={()=>toggle(item)}>{item.active?"Disable":"Enable"}</Button></span></div>):<div className="empty-state">No SLA rules yet. Add global defaults or department overrides above.</div>}</Card><Card className="system-note"><h3>Default policy guidance</h3><p>Recommended starting values: Low 72 hours, Medium 24 hours, High 12 hours, Critical 4 hours. These are configurable operational defaults, not legal requirements.</p><p>Disabling a department rule makes the service fall back to the active global rule for that severity, if one exists.</p></Card></div>;
}

function SystemOverview({ go }: { go:(s:Screen)=>void }) {
 const [d,setD]=useState<any>(null); const [error,setError]=useState("");
 useEffect(()=>{api.admin.systemOverview().then(setD).catch(e=>setError(e instanceof Error?e.message:"Unable to load system overview"))},[]);
 if(error)return <div className="page ops-page"><Card><div className="empty-state">{error}</div></Card></div>;
 if(!d)return <div className="page ops-page"><Card><div className="empty-state">Loading system overview…</div></Card></div>;
 return <div className="page ops-page"><div className="page-heading"><div><span className="eyebrow">PLATFORM CONTROL</span><h1>System overview</h1><p>Technical health, routing coverage, notification delivery and operational integrity — separate from the city performance dashboard.</p></div><Button variant="secondary" onClick={()=>go("audit")}>Open audit trail</Button></div><div className="metric-grid"><Metric label="API" value={d.services.api?"Operational":"Down"} detail="Application service" tone={d.services.api?"metric-green":"metric-red"}/><Metric label="Database" value={d.services.database?"Connected":"Down"} detail="MongoDB connectivity" tone={d.services.database?"metric-green":"metric-red"}/><Metric label="AI service" value={d.services.aiConfigured?"Configured":"Unavailable"} detail="AI pipeline" tone={d.services.aiConfigured?"metric-green":"metric-orange"}/><Metric label="Active officers" value={String(d.routing.activeOfficers)} detail={`${d.routing.departments} active departments`}/><Metric label="Unread notifications" value={String(d.notifications.unread)} detail="Across all users" tone={d.notifications.unread?"metric-orange":"metric-green"}/></div><div className="system-grid"><Card><div className="card-title"><div><h3>Routing integrity</h3><p>AI should route first; admin correction is a fallback.</p></div></div><div className="stat-list"><span>Assigned active cases <b>{d.routing.assignedCases}</b></span><span>Unassigned active cases <b className={d.routing.unassignedCases?"danger-text":""}>{d.routing.unassignedCases}</b></span><span>AI human-review queue <b>{d.routing.aiReviewQueue}</b></span><span>Overdue SLA cases <b className={d.routing.overdueSla?"danger-text":""}>{d.routing.overdueSla}</b></span><span>Audit events, last 24h <b>{d.audit.last24h}</b></span></div><button className="attention-row" onClick={()=>go("ai-review")}><div><b>Correct an AI assignment</b><small>Swap to another officer or department</small></div><Icon name="arrow" size={16}/></button></Card><Card><div className="card-title"><div><h3>Officer coverage</h3><p>One active routing target per department.</p></div></div><div className="coverage-list">{d.officerCoverage.map((x:any)=><div key={x.code}><span><b>{x.name}</b><small>{x.code}</small></span><Status tone={x.officers>0?"green":"red"}>{x.officers} officer{x.officers===1?"":"s"}</Status></div>)}</div></Card></div><Card className="system-note"><h3>What this page means</h3><p><b>Dashboard</b> answers “How is the city performing?” with workload, resolution and service metrics.</p><p><b>System Overview</b> answers “Is CiviX itself healthy?” with infrastructure, routing coverage, notifications and audit integrity.</p></Card></div>;
}

function Analytics() {
 const [d,setD]=useState<any>(null);useEffect(()=>{api.admin.analytics().then(setD).catch(()=>{})},[]);if(!d)return <div className="page"><Card><div className="empty-state">Loading analytics…</div></Card></div>;return <div className="page ops-page"><div className="page-heading"><div><span className="eyebrow">CITY INTELLIGENCE</span><h1>Analytics</h1><p>Calculated from live grievance, user, SLA and department data.</p></div><Button variant="secondary" onClick={()=>downloadJson("civix-analytics.json",d)}>Export dashboard</Button></div><div className="metric-grid"><Metric label="Resolution rate" value={`${d.grievances.resolutionRate}%`} detail={`${d.grievances.resolved} resolved`}/><Metric label="Active grievances" value={String(d.grievances.active)} detail="Current"/><Metric label="Total users" value={String(d.users.total)} detail="Active accounts"/><Metric label="SLA compliance" value={`${d.sla.compliance}%`} detail="Stored SLA data"/><Metric label="Participation" value={String(d.grievances.received30)} detail="Reports in last 30 days"/></div><div className="analytics-grid"><Card className="chart-card"><h3>Grievance volume by category</h3><div className="horizontal-bars">{d.byCategory.map((x:any)=><div key={x._id||"unknown"}><span>{x._id||"Uncategorized"}</span><i><em style={{width:`${Math.min(100,x.count/Math.max(1,d.grievances.total)*100)}%`}}/></i><b>{x.count}</b></div>)}</div></Card><Card><h3>Severity distribution</h3><div className="donut-list">{d.bySeverity.map((x:any)=><div key={x._id||"unknown"}><span className={`severity-dot ${x._id||"medium"}`}/><b>{x._id||"Unrated"}</b><strong>{x.count}</strong></div>)}</div></Card></div><Card className="workflow-card"><div className="card-title"><div><h3>Government resolution flow</h3><p>Live status lifecycle defined by the CiviX PRD.</p></div></div><div className="workflow-flow large">{["SUBMITTED","AI_PROCESSED","ASSIGNED","ACKNOWLEDGED","IN_PROGRESS","RESOLUTION_SUBMITTED","VERIFICATION","RESOLVED"].map((x,i)=><div key={x}><span>{i+1}</span><b>{x.replace(/_/g," ")}</b>{i<7&&<i>→</i>}</div>)}</div></Card></div>;
}

function Audit({ moderation=false }: { moderation?:boolean }) {
 const [items,setItems]=useState<any[]>([]);const [loading,setLoading]=useState(true);useEffect(()=>{(moderation?api.admin.moderation():api.admin.audit(new URLSearchParams({page:"1",limit:"100"}))).then(r=>setItems(r.items)).finally(()=>setLoading(false))},[moderation]);return <div className="page ops-page"><div className="page-heading"><div><span className="eyebrow">ACCOUNTABILITY & SAFETY</span><h1>{moderation?"Content moderation":"Audit logs"}</h1><p>{moderation?"Live public content records.":"Immutable records of system and staff actions."}</p></div></div><Card className="data-table audit-table"><div className="table-head"><span>{moderation?"Content":"Actor"}</span><span>{moderation?"Status":"Action"}</span><span>Reference</span><span>Details</span><span>Timestamp</span></div>{loading?<div className="empty-state">Loading…</div>:items.map((x:any)=><div className="table-row" key={x._id}><span><b>{moderation?x.authorId?.name||"User":x.actorId?.name||"System"}</b><small>{moderation?x.authorId?.username||"":""}</small></span><span>{moderation?(x.moderated?"Moderated":"Pending review"):x.action}</span><span><b>{moderation?x.grievanceId?.grievanceId||"Post":x.grievanceId?.grievanceId||"System"}</b></span><span>{moderation?x.grievanceId?.text?.slice(0,60)||"":""}</span><span>{new Date(x.createdAt||x.publishedAt).toLocaleString()}</span>{moderation&&<button className="text-action" onClick={()=>api.admin.moderate(x._id,!x.moderated).then(()=>setItems(items.map((i:any)=>i._id===x._id?{...i,moderated:!x.moderated}:i)))}>{x.moderated?"Restore":"Hide"}</button>}</div>)}</Card></div>;
}

function CitizenGrievances({ go }: { go:(s:Screen)=>void }) {
 const [items,setItems]=useState<Grievance[]>([]); const [filter,setFilter]=useState("all"); useEffect(()=>{api.grievances.list(new URLSearchParams({mine:"true",page:"1",limit:"100"})).then(r=>setItems(r.items)).catch(()=>setItems([]))},[]); const visible=filter==="all"?items:filter==="inprogress"?items.filter(x=>x.status==="IN_PROGRESS"):filter==="resolved"?items.filter(x=>x.status==="RESOLVED"):items.filter(x=>["SUBMITTED","AI_PROCESSED","ASSIGNED","ACKNOWLEDGED"].includes(x.status)); return <div className="page narrow-page"><div className="page-heading"><div><span className="eyebrow">YOUR CIVIC RECORD</span><h1>My grievances</h1><p>Track every report from submission to resolution.</p></div><Button variant="accent" icon="report" onClick={()=>go("report")}>New report</Button></div><div className="tabs">{[["all","All"],["inprogress","In Progress"],["resolved","Resolved"],["pending","Pending"]].map(([key,label])=><button className={filter===key?"active":""} onClick={()=>setFilter(key)} key={key}>{label} <b>{key==="all"?items.length:key==="inprogress"?items.filter(x=>x.status==="IN_PROGRESS").length:key==="resolved"?items.filter(x=>x.status==="RESOLVED").length:items.filter(x=>["SUBMITTED","AI_PROCESSED","ASSIGNED","ACKNOWLEDGED"].includes(x.status)).length}</b></button>)}</div>{visible.length?visible.map(item=><IssueCard key={item.grievanceId} go={go} compact grievance={item} resolved={item.status==="RESOLVED"}/>):<Card><div className="empty-state">No grievances in this filter.</div></Card>}</div>;
}

export default function App() {
  const storedToken = typeof window !== "undefined" ? localStorage.getItem("civix_token") : null;
  const storedUser = typeof window !== "undefined" ? localStorage.getItem("civix_user") : null;
  // Page position is session-scoped: it survives refreshes but is cleared when the
  // browser tab/session is closed. Authentication itself remains persisted.
  const browserSessionStarted = typeof window !== "undefined" ? sessionStorage.getItem("civix_browser_session") === "1" : false;
  if (typeof window !== "undefined" && !browserSessionStarted) {
    sessionStorage.setItem("civix_browser_session", "1");
  }
  const storedScreen = browserSessionStarted && typeof window !== "undefined"
    ? localStorage.getItem("civix_screen") as Screen | null
    : null;
  const [screen,setScreen]=useState<Screen>(()=>storedToken && browserSessionStarted ? (storedScreen || "home") : "landing");
  const [theme,setTheme]=useState(()=>typeof window!=="undefined" ? localStorage.getItem("civix_theme") || "dark" : "dark");
  const [user,setUser]=useState<User|null>(()=>{try{return storedToken && storedUser ? JSON.parse(storedUser) : null;}catch{return null;}});
  const [workspace,setWorkspace]=useState<Role>(()=>{try{return storedToken && storedUser ? (JSON.parse(storedUser).role || "citizen") : "citizen";}catch{return "citizen";}});
  const [pendingScreen,setPendingScreen]=useState<Screen|null>(null);
  const [unread,setUnread]=useState(0);
  const [searchQuery,setSearchQuery]=useState("");
  const [authBooting,setAuthBooting]=useState(Boolean(storedToken && browserSessionStarted));
  const {location}=useLiveLocation(!!user);
  useEffect(()=>{localStorage.setItem("civix_theme",theme)},[theme]);

  useEffect(()=>{
    const token=localStorage.getItem("civix_token");
    // A new browser session starts at the hero/landing page. Do not restore
    // the previous workspace until the user navigates back into the app.
    if(!browserSessionStarted){setAuthBooting(false);return;}
    if(!token){setAuthBooting(false);return;}
    const cachedRaw=localStorage.getItem("civix_user");
    if(cachedRaw){try{const cached=JSON.parse(cachedRaw) as User;setUser(cached);setWorkspace(cached.role);}catch{}}
    api.auth.me().then(u=>{
      setUser(u);
      setWorkspace(u.role);
      localStorage.setItem("civix_user",JSON.stringify(u));
      if(!localStorage.getItem("civix_screen")){
        const next=u.role==="admin"?"dashboard":"home";
        setScreen(next);
        localStorage.setItem("civix_screen",next);
      }
    }).catch((error)=>{
      const status=(error as Error & {status?:number}).status;
      // A real 401 means the session is invalid. Network/5xx errors must not log the user out.
      if(status===401){
        localStorage.removeItem("civix_token");
        localStorage.removeItem("civix_user");
        localStorage.removeItem("civix_screen");
        setUser(null);
        setScreen("login");
      }
    }).finally(()=>setAuthBooting(false));
  },[]);

  useEffect(()=>{if(!user)return;let active=true;const loadUnread=()=>api.notifications(new URLSearchParams({read:"false",page:"1",limit:"1"})).then(r=>{if(active)setUnread(r.total||0)}).catch(()=>{});loadUnread();const timer=window.setInterval(loadUnread,10000);return()=>{active=false;window.clearInterval(timer)}},[user,screen]);
  useEffect(()=>{const params=new URLSearchParams(window.location.search);if(params.get("screen")==="reset"&&params.get("token")&&params.get("email")){setScreen("reset");localStorage.setItem("civix_screen","reset");return;}if(params.get("emailVerified")==="success"){setScreen("login");localStorage.setItem("civix_screen","login");window.history.replaceState({},"",window.location.pathname)}},[]);

  const go=(target:Screen)=>{
    const authScreens:Screen[]=["login","register","email-sent","verify-email","forgot","reset","reset-success"];
    setGlobalLoading(true);
    const finish=()=>setGlobalLoading(false);
    if(target==="landing"){setPendingScreen(null);setScreen("landing");localStorage.setItem("civix_screen","landing");window.scrollTo({top:0,behavior:"smooth"});window.setTimeout(finish,350);return;}
    if(!user&&!authScreens.includes(target)){setPendingScreen(target);setScreen("login");localStorage.setItem("civix_screen","login");window.setTimeout(finish,350);return;}
    setScreen(target);
    localStorage.setItem("civix_screen",target);
    window.scrollTo({top:0,behavior:"smooth"});
    window.setTimeout(finish,350);
  };

  const completeAuthentication=()=>{const raw=localStorage.getItem("civix_user");const u=raw?JSON.parse(raw):null;setUser(u);if(u?.role)setWorkspace(u.role);setPendingScreen(null);const next=(u?.role==="admin"?"dashboard":"home") as Screen;setScreen(next);localStorage.setItem("civix_screen",next);};
  const logout=async()=>{try{await api.auth.logout()}catch{}localStorage.removeItem("civix_token");localStorage.removeItem("civix_user");localStorage.removeItem("civix_screen");setUser(null);setScreen("login")};
  const authScreens:Screen[]=["login","register","verify-email","email-sent","forgot","reset","reset-success"];
  if(authBooting)return <div data-theme={theme}><div className="app-auth-boot"><div className="boot-card"><div className="boot-spinner"/><b>Restoring your CiviX session…</b><span>Loading your workspace securely.</span></div></div></div>;
  if(screen==="landing")return <div data-theme={theme}><Landing go={go} theme={theme} setTheme={setTheme}/></div>;
  if(authScreens.includes(screen))return <div data-theme={theme}><Auth screen={screen} go={go} onAuthenticated={completeAuthentication}/></div>;
  if(!user)return null;
  if(screen==="report")return <div data-theme={theme}><ReportFlow go={go} location={location}/></div>;
  if(screen==="emergency-report")return <div data-theme={theme}><ReportFlow go={go} location={location} mode="emergency"/></div>;
  if(screen==="emergency-success")return <div data-theme={theme}><EmergencySuccess go={go}/></div>;
  if(screen==="success")return <div data-theme={theme}><Success go={go}/></div>;
  const content:ReactNode=screen==="home"?<Home go={go} location={location} user={user}/>
    :screen==="feed"?<Feed go={go} location={location} searchQuery={searchQuery}/>
    :screen==="nearby"?<Feed go={go} nearby location={location} searchQuery={searchQuery}/>
    :screen==="grievances"?<CitizenGrievances go={go}/>
    :screen==="emergency"?<EmergencyCenter role={workspace} onCitizenReport={()=>go("emergency-report")}/>
    :screen==="detail"?<Detail go={go}/>
    :screen==="notifications"?<Notifications go={go} role={workspace}/>
    :screen==="profile"?<Profile go={go} user={user} onUser={u=>{setUser(u);localStorage.setItem("civix_user",JSON.stringify(u))}}/>
    :screen==="impact"&&workspace==="citizen"?<Profile impactOnly go={go} user={user} onUser={u=>{setUser(u);localStorage.setItem("civix_user",JSON.stringify(u))}}/>
    :screen==="dashboard"?(workspace==="admin"?<AdminDashboard go={go}/>:<OfficerDashboard go={go} location={location}/>)
    :screen==="system-overview"?<SystemOverview go={go}/>
    :screen==="sla-config"?<SLAConfiguration/>
    :screen==="incidents"?<Incidents go={go}/>
    :screen==="acknowledge"?<Incidents go={go} filterStatus="ASSIGNED"/>
    :screen==="sla"?<Incidents go={go} filterStatus="IN_PROGRESS"/>
    :screen==="resolved"?<Incidents go={go} filterStatus="RESOLVED"/>
    :screen==="incident"?<Incident go={go} location={location} user={user}/>
    :screen==="resolution"?<Resolution go={go} location={location}/>
    :screen==="map"?<GISMap go={go} location={location}/>
    :screen==="analytics"?<Analytics/>
    :screen==="users"?<AdminDirectory mode="users"/>
    :screen==="departments"?<AdminDirectory mode="departments"/>
    :screen==="ai-review"?<AIReview go={go}/>
    :screen==="moderation"?<Audit moderation/>:<Audit/>;
  return <div className="app" data-theme={theme}><Sidebar role={workspace} actualRole={user.role} screen={screen} go={go} onLogout={logout} onWorkspace={r=>{if(user.role==="admin") {setWorkspace(r);setScreen("dashboard");localStorage.setItem("civix_screen","dashboard")}}}/><div className="app-body"><Header theme={theme} setTheme={setTheme} go={go} user={user} unread={unread} onLogout={logout} searchQuery={searchQuery} onSearch={q=>{setSearchQuery(q);if(!q.trim())localStorage.removeItem("civix_search")}}/>{content}</div><SupportAssistant role={workspace}/>{workspace==="citizen"&&<BottomNav screen={screen} go={go}/>}<button className="mobile-logout" onClick={logout} aria-label="Log out" style={{display:"none"}}/><Footer compact/></div>;
}
