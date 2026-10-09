import mongoose, { Schema, model } from 'mongoose';
const emergencyAssignmentSchema = new Schema({
  planId: { type: Schema.Types.ObjectId, ref: 'EmergencyAllocationPlan', required: true, index: true },
  incidentId: { type: Schema.Types.ObjectId, ref: 'EmergencyIncident', required: true, index: true },
  resourceId: { type: Schema.Types.ObjectId, ref: 'EmergencyResource', required: true },
  quantity: { type: Number, required: true, min: 1 },
  taskType: { type: String, required: true },
  status: { type: String, enum: ['ASSIGNED','ACKNOWLEDGED','EN_ROUTE','ON_SCENE','COMPLETED','CANCELLED'], default: 'ASSIGNED', index: true },
  simulationMode: { type: Boolean, default: false },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  history: { type: [{ status: String, actorId: Schema.Types.ObjectId, at: Date, note: String }], default: [] },
}, { timestamps: true });
export const EmergencyAssignment = mongoose.models.EmergencyAssignment || model('EmergencyAssignment', emergencyAssignmentSchema);
