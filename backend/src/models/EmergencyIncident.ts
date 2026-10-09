import mongoose, { Schema, model } from 'mongoose';

const emergencyIncidentSchema = new Schema({
  incidentCode: { type: String, unique: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 180 },
  hazardType: { type: String, required: true, enum: ['FLOOD','FIRE','EARTHQUAKE','LANDSLIDE','STORM','INFRASTRUCTURE','MEDICAL','OTHER'], index: true },
  description: { type: String, required: true, trim: true, maxlength: 5000 },
  status: { type: String, enum: ['REPORTED','ASSESSING','ACTIVE','CONTAINED','RESOLVED','CLOSED'], default: 'REPORTED', index: true },
  severity: { type: String, enum: ['LOW','MEDIUM','HIGH','CRITICAL'], default: 'MEDIUM', index: true },
  priorityScore: { type: Number, default: 50, min: 0, max: 100 },
  location: { type: { type: String, enum: ['Point'] }, coordinates: { type: [Number], default: undefined } },
  affectedArea: { type: String, default: '' },
  reportCount: { type: Number, default: 0, min: 0 },
  estimatedAffectedPeople: { type: Number, default: 0, min: 0 },
  verifiedAffectedPeople: { type: Number, default: 0, min: 0 },
  peopleRescued: { type: Number, default: 0, min: 0 },
  peopleAssisted: { type: Number, default: 0, min: 0 },
  unresolvedNeeds: { type: [String], default: [] },
  simulationMode: { type: Boolean, default: false, index: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  activatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  activatedAt: Date,
}, { timestamps: true });

emergencyIncidentSchema.index({ location: '2dsphere' }, { sparse: true });
export const EmergencyIncident = mongoose.models.EmergencyIncident || model('EmergencyIncident', emergencyIncidentSchema);
