import mongoose, { Schema, model } from 'mongoose';
const allocationItemSchema = new Schema({
  incidentId: { type: Schema.Types.ObjectId, ref: 'EmergencyIncident', required: true },
  resourceId: { type: Schema.Types.ObjectId, ref: 'EmergencyResource', required: true },
  resourceName: { type: String, required: true },
  resourceType: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  taskType: { type: String, required: true },
  reason: { type: String, required: true },
}, { _id: false });
const emergencyAllocationPlanSchema = new Schema({
  planCode: { type: String, unique: true, index: true },
  assignments: { type: [allocationItemSchema], default: [] },
  unmetNeeds: { type: [{ incidentId: String, need: String, requested: Number, available: Number }], default: [] },
  status: { type: String, enum: ['PROPOSED','APPROVING','APPROVED','REJECTED','SUPERSEDED'], default: 'PROPOSED', index: true },
  simulationMode: { type: Boolean, default: false },
  summary: { type: String, default: '' },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  approvedAt: Date,
}, { timestamps: true });
export const EmergencyAllocationPlan = mongoose.models.EmergencyAllocationPlan || model('EmergencyAllocationPlan', emergencyAllocationPlanSchema);
