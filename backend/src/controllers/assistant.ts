import { Response } from 'express';
import { Grievance } from '../models/Grievance.js';
import { User } from '../models/User.js';
import { AuthRequest } from '../types/index.js';
import { AppError, ok } from '../utils/http.js';

const ROUTING_DEPARTMENT_NAMES: Record<string, string> = {
  pwd: 'Road Department', water_board: 'Water Department', sanitation: 'Sanitation Department',
  electricity_board: 'Electrical Department', sewerage: 'Sewerage Department', traffic_police: 'Traffic Department',
  police: 'Public Safety', health: 'Healthcare Department', other: 'Other',
};
const STOP_WORDS = new Set(['what','which','where','when','why','how','are','is','the','a','an','my','me','i','we','our','show','tell','give','find','get','about','from','nearby','near','around','area','location','grievance','grievances','issue','issues','civic','report','reports','please','can','you','to','for','of','in','on','with','do','does','there','any','have','has','and','or','latest','current','status','details']);
function departmentName(code?: string | null) { if (!code) return null; return ROUTING_DEPARTMENT_NAMES[code.toLowerCase()] ?? code.replace(/_/g, ' '); }
function escapeRegex(value: string) { return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function distanceKm(lat1:number,lng1:number,lat2:number,lng2:number){const r=Math.PI/180,dLat=(lat2-lat1)*r,dLng=(lng2-lng1)*r,a=Math.sin(dLat/2)**2+Math.cos(lat1*r)*Math.cos(lat2*r)*Math.sin(dLng/2)**2;return 6371*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));}
function grievanceLabel(g:any){return (g.title||g.summary||g.text||g.grievanceId||'Civic issue').trim().replace(/\s+/g,' ');}
function departmentFor(g:any){return g.departmentId?.name??(Array.isArray(g.departments)&&g.departments.length?departmentName(g.departments[0]):null)??'Not assigned yet';}
function statusFor(g:any){return String(g.status??'SUBMITTED').replace(/_/g,' ').toLowerCase();}

export async function ask(req: AuthRequest, res: Response) {
  if (!req.user) throw new AppError(401,'UNAUTHORIZED','Authentication required');
  const message=String(req.body.message??'').trim();
  if(!message) throw new AppError(400,'MESSAGE_REQUIRED','Message is required');
  const user=await User.findById(req.user.id).select('name role').lean();
  const lower=message.toLowerCase();
  const location=req.body.location&&Number.isFinite(Number(req.body.location.latitude))&&Number.isFinite(Number(req.body.location.longitude))?{latitude:Number(req.body.location.latitude),longitude:Number(req.body.location.longitude)}:null;
  const latest=await Grievance.find({userId:req.user.id}).sort({createdAt:-1}).limit(8).populate('departmentId','name code').populate({path:'officerId',populate:{path:'userId',select:'name username profileImage'}}).lean();
  const active=latest.filter(x=>!['RESOLVED','REJECTED'].includes(x.status));
  let response=`I can help with your CiviX data. You currently have ${latest.length} recent grievance(s), ${active.length} of them active.`;
  const context:Record<string,unknown>={recentGrievances:latest.length,activeGrievances:active.length};
  const asksNearby=/\bnearby\b|near me|around me|close to me|in my area|near my location/.test(lower);
  const asksOfficer=/which officer|assigned officer|who is assigned|officer assigned|who handles|who is handling/.test(lower);
  const asksDepartments=lower.includes('department')||lower.includes('departments')||lower.includes('routed')||lower.includes('route')||lower.includes('assigned to');
  const asksMyGrievances=/my grievances|my reports|my issues|all my grievances|show my grievances/.test(lower);
  const asksResolved=/resolved|completed/.test(lower); const asksPending=/pending|open|unresolved|active/.test(lower);

  if(asksNearby){
    if(!location){response='I can show live nearby grievances, but I need your location. Please allow location access in your browser and ask again.';}
    else{
      const nearby=await Grievance.find({status:{$nin:['REJECTED']},location:{$near:{$geometry:{type:'Point',coordinates:[location.longitude,location.latitude]},$maxDistance:5000}}}).limit(8).populate('departmentId','name code').populate({path:'officerId',populate:{path:'userId',select:'name username'}}).lean();
      if(!nearby.length) response='I could not find any active civic grievances within 5 km of your current location. Try increasing the search area or check the Nearby section.';
      else {const lines=nearby.map((g:any)=>{const c=g.location?.coordinates;const d=Array.isArray(c)&&c.length===2?distanceKm(location.latitude,location.longitude,Number(c[1]),Number(c[0])):null;const officer=g.officerId?.userId?.name?` · Officer: ${g.officerId.userId.name}`:'';return `• ${g.grievanceId??'Grievance'} — ${grievanceLabel(g).slice(0,90)} · ${d!==null?`${d.toFixed(1)} km`:'nearby'} · ${statusFor(g)} · ${departmentFor(g)}${officer}`;});response=`I found ${nearby.length} civic grievance(s) within 5 km of you:\n${lines.join('\n')}`;}
      context.nearbyGrievances=nearby.length;
    }
  } else if(asksOfficer){
    const g=latest[0]; if(!g) response='You do not have any grievances yet.'; else {const name=(g as any).officerId?.userId?.name;response=name?`Your latest grievance ${g.grievanceId} is assigned to ${name}. It is currently ${statusFor(g)}.`:`Your latest grievance ${g.grievanceId} does not have an officer assigned yet. It is currently ${statusFor(g)}.`;}
  } else if(asksDepartments){
    if(!latest.length) response='You do not have any grievances yet. You can submit one from the Report an Issue flow.'; else response=`Here are your most recent grievance(s) and their departments:\n${latest.map((g:any)=>`• ${g.grievanceId??'Grievance'} — ${departmentFor(g)} (${statusFor(g)})`).join('\n')}\n\nEach grievance is routed by the CiviX workflow to the appropriate department.`;
  } else if(asksMyGrievances||lower.includes('track')||lower.includes('grievance')||lower.includes('status')){
    if(!latest.length) response='You do not have any grievances yet. You can submit one from the Report an Issue flow.'; else response=`Here are your latest grievance(s):\n${latest.slice(0,5).map((g:any)=>{const officer=g.officerId?.userId?.name?` · Officer: ${g.officerId.userId.name}`:'';return `• ${g.grievanceId} — ${grievanceLabel(g).slice(0,80)} · ${statusFor(g)} · ${departmentFor(g)}${officer}`;}).join('\n')}`;
  } else if(asksResolved||asksPending){
    const rows=asksResolved?latest.filter(g=>g.status==='RESOLVED'):latest.filter(g=>!['RESOLVED','REJECTED'].includes(g.status));
    response=rows.length?`${asksResolved?'Resolved':'Active'} grievance(s):\n${rows.map((g:any)=>`• ${g.grievanceId} — ${grievanceLabel(g).slice(0,85)} · ${statusFor(g)}`).join('\n')}`:`I could not find any ${asksResolved?'resolved':'active'} grievances in your recent records.`;
  } else {
    const words=lower.replace(/[^a-z0-9_ -]/g,' ').split(/\s+/).filter((w:string)=>w.length>=3&&!STOP_WORDS.has(w));
    if(words.length){const pattern=words.slice(0,6).map(escapeRegex).join('|');const related=await Grievance.find({$or:[{text:{$regex:pattern,$options:'i'}},{title:{$regex:pattern,$options:'i'}},{summary:{$regex:pattern,$options:'i'}},{category:{$regex:pattern,$options:'i'}},{subCategory:{$regex:pattern,$options:'i'}},{departments:{$regex:pattern,$options:'i'}}]}).sort({impactScore:-1,createdAt:-1}).limit(6).populate('departmentId','name code').lean();if(related.length){response=`I found ${related.length} grievance(s) related to “${words.slice(0,4).join(' ')}”:\n${related.map((g:any)=>`• ${g.grievanceId} — ${grievanceLabel(g).slice(0,90)} · ${statusFor(g)} · ${departmentFor(g)}`).join('\n')}`;context.relatedGrievances=related.length;}}
  }
  return ok(res,{response,context});
}
