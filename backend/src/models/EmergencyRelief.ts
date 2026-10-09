import mongoose, { Schema, model } from 'mongoose';
const emergencyReliefSchema = new Schema({
  incidentId: { type: Schema.Types.ObjectId, ref: 'EmergencyIncident', required: true, index: true },
  assistanceType: { type: String, required: true, trim: true },
  quantityDelivered: { type: Number, default: 0, min: 0 },
  peopleAssisted: { type: Number, default: 0, min: 0 },
  verificationStatus: { type: String, enum: ['UNVERIFIED','VERIFIED'], default: 'UNVERIFIED' },
  note: { type: String, default: '', maxlength: 1000 },
  simulationMode: { type: Boolean, default: false },
  recordedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });
export const EmergencyRelief = mongoose.models.EmergencyRelief || model('EmergencyRelief', emergencyReliefSchema);
