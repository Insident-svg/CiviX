import { Response } from 'express';
import { randomUUID } from 'node:crypto';
import axios from 'axios';
import { AuthRequest } from '../types/index.js';
import { AppError, ok } from '../utils/http.js';
import { EmergencyIncident } from '../models/EmergencyIncident.js';
import { EmergencyReport } from '../models/EmergencyReport.js';
import { EmergencyResource } from '../models/EmergencyResource.js';
import { EmergencyAllocationPlan } from '../models/EmergencyAllocationPlan.js';
import { EmergencyAssignment } from '../models/EmergencyAssignment.js';
import { EmergencyRelief } from '../models/EmergencyRelief.js';

const hazards = ['FLOOD','FIRE','EARTHQUAKE','LANDSLIDE','STORM','INFRASTRUCTURE','MEDICAL','OTHER'];
const resourceTypes = ['RESCUE_TEAM','MEDICAL_TEAM','FIRE_TEAM','LOGISTICS_TEAM','BOAT','AMBULANCE','MEDICAL_KIT','WATER_PACK','FOOD_PACK','BLANKET','SHELTER_BED','OTHER'];
const text = (v: unknown, max = 5000) => typeof v === 'string' ? v.trim().slice(0, max) : '';
const num = (v: unknown, fallback = 0) => Number.isFinite(Number(v)) ? Math.max(0, Number(v)) : fallback;
function requireUser(req: AuthRequest) { if (!req.user) throw new AppError(401, 'UNAUTHORIZED', 'Authentication required'); return req.user; }
function requireCoordinator(req: AuthRequest) { const user = requireUser(req); if (!['officer','admin'].includes(user.role)) throw new AppError(403, 'FORBIDDEN', 'Emergency coordinator access required'); return user; }
function severityScore(s: string) { return ({ CRITICAL: 100, HIGH: 80, MEDIUM: 55, LOW: 25 } as Record<string, number>)[s] || 50; }
function inferNeeds(description: string, hazard: string) {
 const d = description.toLowerCase(); const needs: string[] = [];
 if (/trap|stranded|evacuat|water rising|flood/.test(d)) needs.push('RESCUE_TEAM','BOAT','SHELTER_BED');
 if (/injur|medical|bleed|unconscious|hospital/.test(d)) needs.push('MEDICAL_TEAM','MEDICAL_KIT');
 if (/fire|smoke|burn/.test(d) || hazard === 'FIRE') needs.push('FIRE_TEAM');
 if (/food|hungry/.test(d)) needs.push('FOOD_PACK');
 if (/water|thirst/.test(d) || hazard === 'FLOOD') needs.push('WATER_PACK');
 if (!needs.length) needs.push(hazard === 'FIRE' ? 'FIRE_TEAM' : 'RESCUE_TEAM');
 return [...new Set(needs)];
}
function scoreIncident(i: any) {
 const sev = severityScore(String(i.severity || 'MEDIUM'));
 const impact = Math.min(100, Math.round(Math.sqrt(Math.max(0, Number(i.estimatedAffectedPeople || 0))) * 10));
 const waiting = Math.min(100, Math.round((Date.now() - new Date(i.createdAt || Date.now()).getTime()) / 60000));
 return Math.min(100, Math.round(sev * 0.55 + impact * 0.3 + waiting * 0.15));
}

export async function overview(req: AuthRequest, res: Response) {
 requireUser(req);
 const citizen = req.user?.role === 'citizen';
 const [incidents, reports, resources, assignments, plans, relief] = await Promise.all([
  citizen
   ? EmergencyIncident.find({ status: { $in: ['ACTIVE','CONTAINED','RESOLVED'] } }).select('incidentCode title hazardType description status severity priorityScore location affectedArea estimatedAffectedPeople verifiedAffectedPeople peopleRescued peopleAssisted unresolvedNeeds simulationMode createdAt updatedAt').sort({ createdAt: -1 }).limit(100).lean()
   : EmergencyIncident.find({}).sort({ createdAt: -1 }).limit(100).lean(),
  EmergencyReport.find(citizen ? { createdBy: req.user?.id } : {}).sort({ createdAt: -1 }).limit(100).lean(),
  citizen ? EmergencyResource.find({ status: { $in: ['AVAILABLE','PARTIALLY_AVAILABLE'] } }).select('name resourceType quantityAvailable quantityTotal quantityReserved status location locationName simulationMode').sort({ resourceType: 1, name: 1 }).lean() : EmergencyResource.find({}).sort({ resourceType: 1, name: 1 }).lean(),
  citizen ? Promise.resolve([]) : EmergencyAssignment.find({}).sort({ createdAt: -1 }).limit(100).populate('resourceId', 'name resourceType').populate('incidentId', 'title incidentCode').lean(),
  citizen ? Promise.resolve([]) : EmergencyAllocationPlan.find({}).sort({ createdAt: -1 }).limit(20).lean(),
  citizen ? Promise.resolve([]) : EmergencyRelief.find({}).sort({ createdAt: -1 }).limit(100).lean(),
 ]);
 const active = incidents.filter((i: any) => !['RESOLVED','CLOSED'].includes(i.status));
 const activeAssignments = assignments.filter((a: any) => !['COMPLETED','CANCELLED'].includes(a.status));
 return ok(res, { incidents, reports, resources, assignments, plans, relief, metrics: {
  activeIncidents: active.length, incomingReports: reports.filter((r: any) => ['RECEIVED','REVIEW_REQUIRED'].includes(r.status)).length,
  estimatedAffected: active.reduce((s: number, i: any) => s + Number(i.estimatedAffectedPeople || 0), 0),
  peopleRescued: incidents.reduce((s: number, i: any) => s + Number(i.peopleRescued || 0), 0),
  peopleAssisted: incidents.reduce((s: number, i: any) => s + Number(i.peopleAssisted || 0), 0),
  deployedResources: resources.reduce((s: number, r: any) => s + Number(r.quantityReserved || 0), 0),
  unresolvedNeeds: active.reduce((s: number, i: any) => s + (i.unresolvedNeeds || []).length, 0),
  activeAssignments: activeAssignments.length,
 }});
}

export async function createIncident(req: AuthRequest, res: Response) {
 const user = requireCoordinator(req); const body = req.body || {};
 const title = text(body.title, 180); const description = text(body.description);
 const hazardType = hazards.includes(body.hazardType) ? body.hazardType : 'OTHER';
 if (!title || !description) throw new AppError(400, 'VALIDATION_ERROR', 'Title and description are required');
 const severity = ['LOW','MEDIUM','HIGH','CRITICAL'].includes(body.severity) ? body.severity : 'MEDIUM';
 const coords = Array.isArray(body.coordinates) && body.coordinates.length === 2 ? body.coordinates.map(Number) : null;
 if (coords && (!coords.every(Number.isFinite) || coords[0] < -180 || coords[0] > 180 || coords[1] < -90 || coords[1] > 90)) throw new AppError(400, 'INVALID_LOCATION', 'Coordinates must be [longitude, latitude]');
 const incident = await EmergencyIncident.create({ incidentCode: `EM-${randomUUID().slice(0,8).toUpperCase()}`, title, description, hazardType, severity, priorityScore: severityScore(severity), status: body.activate === true ? 'ACTIVE' : 'REPORTED', location: coords ? { type: 'Point', coordinates: coords } : undefined, affectedArea: text(body.affectedArea, 160), estimatedAffectedPeople: num(body.estimatedAffectedPeople), unresolvedNeeds: Array.isArray(body.unresolvedNeeds) ? body.unresolvedNeeds.map((x: unknown) => text(x, 100)).filter(Boolean).slice(0, 20) : [], simulationMode: body.simulationMode === true, createdBy: user.id, activatedBy: body.activate === true ? user.id : undefined, activatedAt: body.activate === true ? new Date() : undefined });
 return ok(res, incident, 201);
}

export async function createReport(req: AuthRequest, res: Response) {
 const user = requireUser(req); const body = req.body || {}; const description = text(body.description);
 if (description.length < 8) throw new AppError(400, 'VALIDATION_ERROR', 'Please provide a more detailed emergency description');
 const hazardType = hazards.includes(body.hazardType) ? body.hazardType : (/flood|water rising/i.test(description) ? 'FLOOD' : /fire|smoke/i.test(description) ? 'FIRE' : /earthquake/i.test(description) ? 'EARTHQUAKE' : 'OTHER');
 let severity = ['LOW','MEDIUM','HIGH','CRITICAL'].includes(body.severity) ? body.severity : (/trapped|stranded|unconscious|life.?threat/i.test(description) ? 'CRITICAL' : /injur|evacuat|rising water/i.test(description) ? 'HIGH' : 'MEDIUM');
 let resolvedHazard = hazardType;
 let needs = Array.isArray(body.needs) ? body.needs.map((x: unknown) => text(x, 80)).filter(Boolean).slice(0, 15) : inferNeeds(description, hazardType);
 let aiAssessment = `Rule-assisted triage identified ${resolvedHazard.toLowerCase()} risk. Human review is required before dispatch.`;
 let confidence = 0.55;
 // Optional Groq triage: safe fallback remains available when no key/network is configured.
 const groqKey = process.env.GROQ_API_KEY;
 if (groqKey) {
  try {
   const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
    model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile', temperature: 0.1, response_format: { type: 'json_object' },
    messages: [
     { role: 'system', content: 'You are an emergency report triage assistant. Return JSON only with hazardType (one of FLOOD,FIRE,EARTHQUAKE,LANDSLIDE,STORM,INFRASTRUCTURE,MEDICAL,OTHER), severity (LOW,MEDIUM,HIGH,CRITICAL), needs (array of resource type strings), summary (short string), confidence (number 0 to 1). Do not invent victim counts or resource availability. A human must review all recommendations.' },
     { role: 'user', content: description },
    ],
   }, { timeout: 9000, headers: { Authorization: `Bearer ${groqKey}`, 'Content-Type': 'application/json' } });
   const raw = response.data?.choices?.[0]?.message?.content;
   const parsed = JSON.parse(String(raw || '{}'));
   if (hazards.includes(parsed.hazardType)) resolvedHazard = parsed.hazardType;
   if (['LOW','MEDIUM','HIGH','CRITICAL'].includes(parsed.severity)) severity = parsed.severity;
   if (Array.isArray(parsed.needs)) needs = parsed.needs.map((x: unknown) => text(x, 80)).filter((x: string) => resourceTypes.includes(x)).slice(0, 15);
   if (typeof parsed.summary === 'string' && parsed.summary.trim()) aiAssessment = parsed.summary.trim().slice(0, 600);
   if (Number.isFinite(Number(parsed.confidence))) confidence = Math.max(0, Math.min(1, Number(parsed.confidence)));
  } catch { aiAssessment = `Fallback triage used because AI analysis was unavailable. Possible ${resolvedHazard.toLowerCase()} risk; human review is required before dispatch.`; }
 }
 const coords = Array.isArray(body.coordinates) && body.coordinates.length === 2 ? body.coordinates.map(Number) : null;
 if (coords && (!coords.every(Number.isFinite) || coords[0] < -180 || coords[0] > 180 || coords[1] < -90 || coords[1] > 90)) throw new AppError(400, 'INVALID_LOCATION', 'Coordinates must be [longitude, latitude]');
 if (body.incidentId) { const linked = await EmergencyIncident.findById(body.incidentId); if (!linked) throw new AppError(404, 'INCIDENT_NOT_FOUND', 'Selected incident was not found'); if (['RESOLVED','CLOSED'].includes(linked.status)) throw new AppError(409, 'INCIDENT_CLOSED', 'Cannot add a report to a closed incident'); }
 const media = Array.isArray(body.media) ? body.media.slice(0, 10).flatMap((item: any) => {
  const type = ['image','video','voice'].includes(item?.type) ? item.type : null;
  const url = typeof item?.url === 'string' ? item.url.trim() : '';
  if (!type || !url || url.length > 2048 || !/^https:\/\//i.test(url)) return [];
  return [{ type, url, mimeType: text(item?.mimeType, 120), size: Math.max(0, Math.min(num(item?.size), 100_000_000)) }];
 }) : [];
 const report = await EmergencyReport.create({ reportCode: `ER-${randomUUID().slice(0,8).toUpperCase()}`, description, media, hazardType: resolvedHazard, severity, affectedPeople: num(body.affectedPeople), affectedArea: text(body.affectedArea, 160), needs, aiAssessment, confidence, status: 'REVIEW_REQUIRED', location: coords ? { type: 'Point', coordinates: coords } : undefined, incidentId: body.incidentId || undefined, simulationMode: body.simulationMode === true, createdBy: user.id });
 if (report.incidentId) await EmergencyIncident.findByIdAndUpdate(report.incidentId, { $max: { estimatedAffectedPeople: report.affectedPeople }, $inc: { reportCount: 1 }, $addToSet: { unresolvedNeeds: { $each: needs } } });
 return ok(res, report, 201);
}

export async function linkReport(req: AuthRequest, res: Response) {
 const user = requireCoordinator(req);
 const report = await EmergencyReport.findById(req.params.id);
 if (!report) throw new AppError(404, 'REPORT_NOT_FOUND', 'Emergency report not found');
 const incident = await EmergencyIncident.findById(req.body?.incidentId);
 if (!incident) throw new AppError(404, 'INCIDENT_NOT_FOUND', 'Incident not found');
 if (['RESOLVED','CLOSED'].includes(incident.status)) throw new AppError(409, 'INCIDENT_CLOSED', 'Cannot link a report to a closed incident');
 if (String(report.incidentId || '') === String(incident._id)) return ok(res, report);
 const previousId = report.incidentId ? String(report.incidentId) : null;
 report.incidentId = incident._id as any; report.status = 'LINKED'; await report.save();
 if (previousId) await EmergencyIncident.findByIdAndUpdate(previousId, { $inc: { reportCount: -1 } });
 await EmergencyIncident.findByIdAndUpdate(incident._id, { $inc: { reportCount: 1 }, $max: { estimatedAffectedPeople: report.affectedPeople }, $addToSet: { unresolvedNeeds: { $each: report.needs } } });
 return ok(res, { report, incidentId: String(incident._id), linkedBy: user.id });
}

export async function createResource(req: AuthRequest, res: Response) {
 const user = requireCoordinator(req); const b = req.body || {}; const name = text(b.name, 160); const resourceType = String(b.resourceType || 'OTHER');
 if (!name || !resourceTypes.includes(resourceType)) throw new AppError(400, 'VALIDATION_ERROR', 'A resource name and valid resource type are required');
 const total = Math.floor(num(b.quantityTotal)); if (total < 1) throw new AppError(400, 'VALIDATION_ERROR', 'Quantity must be at least one');
 const coords = Array.isArray(b.coordinates) && b.coordinates.length === 2 ? b.coordinates.map(Number) : null;
 if (coords && (!coords.every(Number.isFinite) || coords[0] < -180 || coords[0] > 180 || coords[1] < -90 || coords[1] > 90)) throw new AppError(400, 'INVALID_LOCATION', 'Coordinates must be [longitude, latitude]');
 const r = await EmergencyResource.create({ name, resourceType, capabilities: Array.isArray(b.capabilities) ? b.capabilities.map((x: unknown) => text(x, 80)).filter(Boolean) : [], quantityTotal: total, quantityAvailable: total, quantityReserved: 0, status: 'AVAILABLE', locationName: text(b.locationName, 160), location: coords ? { type: 'Point', coordinates: coords } : undefined, simulationMode: b.simulationMode === true, createdBy: user.id });
 return ok(res, r, 201);
}

export async function seedSimulation(req: AuthRequest, res: Response) {
 const user = requireCoordinator(req);
 const existing = await EmergencyIncident.countDocuments({ simulationMode: true });
 if (existing) {
  // Backfill map coordinates for demo records created by earlier CIVIX builds.
  const demoIncidents = await EmergencyIncident.find({ simulationMode: true }).sort({ createdAt: 1 }).select('_id title location').lean();
  for (const [index, incident] of demoIncidents.entries()) {
   if (!incident.location?.coordinates?.length) {
    const isMedical = /medical|clinic|market/i.test(String(incident.title || ''));
    await EmergencyIncident.updateOne({ _id: incident._id, 'location.coordinates': { $exists: false } }, { $set: { location: { type: 'Point', coordinates: isMedical ? [81.6218, 21.2387] : index % 2 ? [81.6361, 21.2504] : [81.6352, 21.2511] } } });
   }
  }
  const demoResources = await EmergencyResource.find({ simulationMode: true }).select('_id locationName location').lean();
  const resourceCoords: Record<string, [number, number]> = { 'Canal Depot': [81.6385, 21.2532], 'Central Clinic': [81.6201, 21.2415], 'Ward Warehouse': [81.6294, 21.2468], 'Community Hall': [81.6330, 21.2442] };
  for (const resource of demoResources) if (!resource.location?.coordinates?.length) await EmergencyResource.updateOne({ _id: resource._id, 'location.coordinates': { $exists: false } }, { $set: { location: { type: 'Point', coordinates: resourceCoords[resource.locationName || ''] || [81.6294, 21.2468] } } });
  const demoReports = await EmergencyReport.find({ simulationMode: true }).select('_id hazardType description location').lean();
  for (const [index, report] of demoReports.entries()) if (!report.location?.coordinates?.length) {
   const isMedical = report.hazardType === 'MEDICAL' || /medical|market road/i.test(String(report.description || ''));
   await EmergencyReport.updateOne({ _id: report._id, 'location.coordinates': { $exists: false } }, { $set: { location: { type: 'Point', coordinates: isMedical ? [81.6218, 21.2387] : index % 2 ? [81.6361, 21.2504] : [81.6345, 21.2519] } } });
  }
  return ok(res, { seeded: false, mapLocationsBackfilled: true, message: 'Existing demo scenario reused and map locations refreshed.', incidentCount: existing });
 }
 const incidentSeeds: any[] = [
  { title: 'Ward 12 — Rising floodwater', hazardType: 'FLOOD', description: 'Water entering homes; several families report being stranded near the canal.', severity: 'CRITICAL', estimatedAffectedPeople: 42, affectedArea: 'Ward 12 / Canal Road', location: { type: 'Point', coordinates: [81.6352, 21.2511] }, unresolvedNeeds: ['Evacuation','Drinking water','Shelter'], status: 'ACTIVE' },
  { title: 'Ward 8 — Roadside medical emergency', hazardType: 'MEDICAL', description: 'Several people need urgent medical assessment after a local incident.', severity: 'HIGH', estimatedAffectedPeople: 12, affectedArea: 'Ward 8 / Market Road', location: { type: 'Point', coordinates: [81.6218, 21.2387] }, unresolvedNeeds: ['Medical assessment','First aid'], status: 'ACTIVE' },
 ];
 const incidents = await EmergencyIncident.insertMany(incidentSeeds.map(i => ({ ...i, incidentCode: `SIM-${randomUUID().slice(0,6).toUpperCase()}`, priorityScore: severityScore(i.severity), simulationMode: true, createdBy: user.id, activatedBy: user.id, activatedAt: new Date() })));
 const resourceSeeds: [string, string, number, string[], string][] = [
  ['Rescue Team Alpha','RESCUE_TEAM',2,['evacuation','water rescue'],'Canal Depot'],['Medical Team Bravo','MEDICAL_TEAM',2,['first aid','triage'],'Central Clinic'],['Flood Boat Unit 1','BOAT',2,['water rescue'],'Canal Depot'],['Ambulance Unit 3','AMBULANCE',1,['medical transport'],'Central Clinic'],['Drinking Water Packs','WATER_PACK',120,['relief'],'Ward Warehouse'],['Medical Kits','MEDICAL_KIT',18,['first aid'],'Central Clinic'],['Emergency Shelter Beds','SHELTER_BED',60,['shelter'],'Community Hall'],['Food Relief Packs','FOOD_PACK',90,['relief'],'Ward Warehouse'],['Logistics Team Delta','LOGISTICS_TEAM',2,['distribution'],'Ward Warehouse']
 ];
 const resourceCoords: Record<string, [number, number]> = { 'Canal Depot': [81.6385, 21.2532], 'Central Clinic': [81.6201, 21.2415], 'Ward Warehouse': [81.6294, 21.2468], 'Community Hall': [81.6330, 21.2442] };
 await EmergencyResource.insertMany(resourceSeeds.map(([name, resourceType, quantity, capabilities, locationName]) => ({ name, resourceType, quantityTotal: quantity, quantityAvailable: quantity, quantityReserved: 0, capabilities, locationName, location: { type: 'Point', coordinates: resourceCoords[locationName] || [81.6294, 21.2468] }, status: 'AVAILABLE', simulationMode: true, createdBy: user.id })));
 const reportSeeds = [
  { description: 'Floodwater is entering ground floors; two families are stranded and need evacuation.', hazardType: 'FLOOD', severity: 'CRITICAL', affectedPeople: 8, needs: ['RESCUE_TEAM','BOAT','SHELTER_BED','WATER_PACK'], incidentId: incidents[0]._id },
  { description: 'Residents need drinking water and a safe temporary shelter due to rising water.', hazardType: 'FLOOD', severity: 'HIGH', affectedPeople: 16, needs: ['WATER_PACK','SHELTER_BED'], incidentId: incidents[0]._id },
  { description: 'People at the market road need first aid and medical assessment.', hazardType: 'MEDICAL', severity: 'HIGH', affectedPeople: 6, needs: ['MEDICAL_TEAM','MEDICAL_KIT','AMBULANCE'], incidentId: incidents[1]._id },
 ];
 await EmergencyReport.insertMany(reportSeeds.map((r: any, index: number) => ({ ...r, location: { type: 'Point', coordinates: index === 2 ? [81.6218, 21.2387] : index === 1 ? [81.6361, 21.2504] : [81.6345, 21.2519] }, reportCode: `SIM-R-${randomUUID().slice(0,5).toUpperCase()}`, aiAssessment: 'Simulated triage result. Review before operational use.', confidence: 0.82, status: 'REVIEW_REQUIRED', simulationMode: true, createdBy: user.id })));
 return ok(res, { seeded: true, incidents: incidents.length, resources: resourceSeeds.length, reports: reportSeeds.length });
}

export async function optimize(req: AuthRequest, res: Response) {
 const user = requireCoordinator(req);
 const simulationMode = req.body?.simulationMode === true;
 const incidents = await EmergencyIncident.find({ status: { $in: ['REPORTED','ASSESSING','ACTIVE','CONTAINED'] }, ...(simulationMode ? { simulationMode: true } : {}) }).sort({ createdAt: 1 });
 const resources = await EmergencyResource.find({ status: { $in: ['AVAILABLE','PARTIALLY_AVAILABLE'] }, quantityAvailable: { $gt: 0 }, ...(simulationMode ? { simulationMode: true } : {}) }).sort({ resourceType: 1, quantityAvailable: -1 });
 const needsMap: Record<string, string[]> = { FLOOD: ['RESCUE_TEAM','BOAT','WATER_PACK','SHELTER_BED','FOOD_PACK'], FIRE: ['FIRE_TEAM','AMBULANCE','MEDICAL_KIT'], EARTHQUAKE: ['RESCUE_TEAM','MEDICAL_TEAM','MEDICAL_KIT','SHELTER_BED','WATER_PACK'], LANDSLIDE: ['RESCUE_TEAM','AMBULANCE','MEDICAL_TEAM'], STORM: ['RESCUE_TEAM','WATER_PACK','SHELTER_BED','FOOD_PACK'], MEDICAL: ['MEDICAL_TEAM','AMBULANCE','MEDICAL_KIT'], INFRASTRUCTURE: ['RESCUE_TEAM','LOGISTICS_TEAM'], OTHER: ['RESCUE_TEAM','LOGISTICS_TEAM'] };
 const assignments: any[] = []; const unmetNeeds: any[] = [];
 const remaining = new Map<string, number>(resources.map(r => [String(r._id), Number(r.quantityAvailable)] as [string, number]));
 for (const incident of incidents.sort((a: any, b: any) => scoreIncident(b) - scoreIncident(a))) {
  const needs = [...new Set([...(needsMap[incident.hazardType] || needsMap.OTHER), ...(incident.unresolvedNeeds || []).filter((n: string) => resourceTypes.includes(n))])];
  const demandMultiplier = Math.max(1, Math.min(3, Math.ceil(Math.max(1, incident.estimatedAffectedPeople) / 20)));
  for (const need of needs) {
   const isDeployable = need.endsWith('_TEAM') || ['BOAT','AMBULANCE'].includes(need);
   const requestedQuantity = isDeployable ? demandMultiplier : Math.max(1, demandMultiplier * (need === 'WATER_PACK' ? 20 : need === 'FOOD_PACK' ? 15 : need === 'SHELTER_BED' ? 10 : 5));
   const candidates = resources.filter(r => r.resourceType === need && (remaining.get(String(r._id)) || 0) > 0);
   if (!candidates.length) { unmetNeeds.push({ incidentId: String(incident._id), need, requested: requestedQuantity, available: 0 }); continue; }
   const resource = candidates[0]; const available = remaining.get(String(resource._id)) || 0;
   const quantity = Math.min(available, requestedQuantity);
   if (quantity < requestedQuantity) unmetNeeds.push({ incidentId: String(incident._id), need, requested: requestedQuantity, available: quantity });
   if (quantity < 1) { unmetNeeds.push({ incidentId: String(incident._id), need, requested: demandMultiplier, available }); continue; }
   remaining.set(String(resource._id), available - quantity);
   assignments.push({ incidentId: incident._id, resourceId: resource._id, resourceName: resource.name, resourceType: resource.resourceType, quantity, taskType: need, reason: `Priority ${scoreIncident(incident)}/100; matched ${need} to ${incident.hazardType.toLowerCase()} needs while respecting available inventory.` });
  }
 }
 const plan = await EmergencyAllocationPlan.create({ planCode: `PLAN-${randomUUID().slice(0,8).toUpperCase()}`, assignments, unmetNeeds, status: 'PROPOSED', simulationMode, summary: `Proposed ${assignments.length} allocations across ${incidents.length} incidents; ${unmetNeeds.length} needs remain unmet. Approval is required before assignments become active.`, createdBy: user.id });
 return ok(res, plan, 201);
}

export async function approvePlan(req: AuthRequest, res: Response) {
 const user = requireCoordinator(req);
 // Compare-and-set the plan status to prevent two coordinators approving the same plan concurrently.
 const plan = await EmergencyAllocationPlan.findOneAndUpdate(
  { _id: req.params.id, status: 'PROPOSED' }, { $set: { status: 'APPROVING' } }, { returnDocument: 'after' },
 );
 if (!plan) {
  const existing = await EmergencyAllocationPlan.findById(req.params.id);
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Allocation plan not found');
  throw new AppError(409, 'INVALID_STATE', 'Only proposed plans can be approved');
 }
 const requiredByResource = new Map<string, number>();
 for (const item of plan.assignments) requiredByResource.set(String(item.resourceId), (requiredByResource.get(String(item.resourceId)) || 0) + item.quantity);
 const reserved: Array<{ resourceId: string; quantity: number }> = [];
 try {
  for (const [resourceId, required] of requiredByResource) {
   const resource = await EmergencyResource.findOneAndUpdate(
    { _id: resourceId, quantityAvailable: { $gte: required }, status: { $in: ['AVAILABLE','PARTIALLY_AVAILABLE'] } },
    { $inc: { quantityAvailable: -required, quantityReserved: required } }, { returnDocument: 'after' },
   );
   if (!resource) throw new AppError(409, 'RESOURCE_CONFLICT', `Resource ${resourceId} is no longer available in the required quantity. Generate a new plan.`);
   reserved.push({ resourceId, quantity: required });
   resource.status = resource.quantityAvailable === 0 ? 'DEPLOYED' : 'PARTIALLY_AVAILABLE';
   await resource.save();
  }
  await EmergencyAssignment.insertMany(plan.assignments.map((item: (typeof plan.assignments)[number]) => ({ planId: plan._id, incidentId: item.incidentId, resourceId: item.resourceId, quantity: item.quantity, taskType: item.taskType, status: 'ASSIGNED', simulationMode: plan.simulationMode, createdBy: user.id, history: [{ status: 'ASSIGNED', actorId: user.id, at: new Date(), note: 'Created from approved allocation plan' }] })));
  plan.status = 'APPROVED'; plan.approvedBy = user.id as any; plan.approvedAt = new Date(); await plan.save();
  return ok(res, plan);
 } catch (error) {
  await EmergencyAssignment.deleteMany({ planId: plan._id });
  for (const item of reserved) {
   const resource = await EmergencyResource.findByIdAndUpdate(item.resourceId, { $inc: { quantityAvailable: item.quantity, quantityReserved: -item.quantity } }, { returnDocument: 'after' });
   if (resource) { resource.status = resource.quantityAvailable > 0 ? (resource.quantityReserved > 0 ? 'PARTIALLY_AVAILABLE' : 'AVAILABLE') : 'DEPLOYED'; await resource.save(); }
  }
  plan.status = 'PROPOSED'; await plan.save();
  throw error;
 }
}

export async function updateAssignment(req: AuthRequest, res: Response) {
 const user = requireCoordinator(req); const allowed = ['ACKNOWLEDGED','EN_ROUTE','ON_SCENE','COMPLETED','CANCELLED']; const status = String(req.body?.status || '');
 if (!allowed.includes(status)) throw new AppError(400, 'INVALID_STATUS', 'Unsupported assignment status');
 const assignment = await EmergencyAssignment.findById(req.params.id); if (!assignment) throw new AppError(404, 'NOT_FOUND', 'Assignment not found');
 if (['COMPLETED','CANCELLED'].includes(assignment.status)) throw new AppError(409, 'INVALID_STATE', 'Completed or cancelled assignments cannot be changed');
 const nextByStatus: Record<string, string[]> = { ASSIGNED: ['ACKNOWLEDGED','CANCELLED'], ACKNOWLEDGED: ['EN_ROUTE','CANCELLED'], EN_ROUTE: ['ON_SCENE','CANCELLED'], ON_SCENE: ['COMPLETED','CANCELLED'] };
 if (!(nextByStatus[assignment.status] || []).includes(status)) throw new AppError(409, 'INVALID_TRANSITION', `Cannot move assignment from ${assignment.status} to ${status}`);
 assignment.status = status as any; assignment.history.push({ status, actorId: user.id as any, at: new Date(), note: text(req.body?.note, 500) }); await assignment.save();
 if (status === 'COMPLETED' || status === 'CANCELLED') {
  const resource = await EmergencyResource.findById(assignment.resourceId);
  if (resource) {
   resource.quantityReserved = Math.max(0, resource.quantityReserved - assignment.quantity);
   const reusable = /TEAM$|BOAT$|AMBULANCE$/.test(resource.resourceType);
   if (reusable && status === 'COMPLETED') resource.quantityAvailable = Math.min(resource.quantityTotal, resource.quantityAvailable + assignment.quantity);
   if (status === 'CANCELLED') resource.quantityAvailable = Math.min(resource.quantityTotal, resource.quantityAvailable + assignment.quantity);
   resource.status = resource.quantityAvailable > 0 ? (resource.quantityReserved > 0 ? 'PARTIALLY_AVAILABLE' : 'AVAILABLE') : (resource.quantityReserved > 0 ? 'DEPLOYED' : 'DEPLETED');
   await resource.save();
  }
 }
 return ok(res, assignment);
}

export async function recordRelief(req: AuthRequest, res: Response) {
 const user = requireCoordinator(req); const b = req.body || {}; const incident = await EmergencyIncident.findById(b.incidentId);
 if (!incident) throw new AppError(404, 'NOT_FOUND', 'Incident not found');
 const assistanceType = text(b.assistanceType, 120); if (!assistanceType) throw new AppError(400, 'VALIDATION_ERROR', 'Assistance type is required');
 const peopleAssisted = Math.floor(num(b.peopleAssisted)); const quantityDelivered = num(b.quantityDelivered);
 const relief = await EmergencyRelief.create({ incidentId: incident._id, assistanceType, peopleAssisted, quantityDelivered, verificationStatus: b.verify === true && user.role === 'admin' ? 'VERIFIED' : 'UNVERIFIED', note: text(b.note, 1000), simulationMode: b.simulationMode === true, recordedBy: user.id });
 incident.peopleAssisted += peopleAssisted; if (b.peopleRescued !== undefined) incident.peopleRescued += Math.floor(num(b.peopleRescued)); incident.unresolvedNeeds = incident.unresolvedNeeds.filter((n: string) => !String(b.resolveNeed || '').split('|').includes(n)); await incident.save();
 return ok(res, { relief, incident }, 201);
}

export async function activateIncident(req: AuthRequest, res: Response) {
 const user = requireCoordinator(req); const incident = await EmergencyIncident.findById(req.params.id);
 if (!incident) throw new AppError(404, 'NOT_FOUND', 'Incident not found');
 incident.status = 'ACTIVE'; incident.activatedBy = user.id as any; incident.activatedAt = new Date(); await incident.save(); return ok(res, incident);
}
