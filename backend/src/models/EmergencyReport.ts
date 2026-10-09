import mongoose, { Schema, model } from 'mongoose';
const mediaSchema = new Schema({ type: { type: String, enum: ['image','video','voice'], required: true }, url: { type: String, required: true }, mimeType: String, size: Number }, { _id: false });
const emergencyReportSchema = new Schema({
  reportCode: { type: String, unique: true, index: true },
  incidentId: { type: Schema.Types.ObjectId, ref: 'EmergencyIncident', index: true },
  description: { type: String, required: true, trim: true, maxlength: 5000 },
  media: { type: [mediaSchema], default: [] },
  hazardType: { type: String, enum: ['FLOOD','FIRE','EARTHQUAKE','LANDSLIDE','STORM','INFRASTRUCTURE','MEDICAL','OTHER'], default: 'OTHER' },
  location: { type: { type: String, enum: ['Point'] }, coordinates: { type: [Number], default: undefined } },
  affectedPeople: { type: Number, default: 0, min: 0 },
  affectedArea: { type: String, default: '', maxlength: 160 },
  needs: { type: [String], default: [] },
  severity: { type: String, enum: ['LOW','MEDIUM','HIGH','CRITICAL'], default: 'MEDIUM' },
  aiAssessment: { type: String, default: '' },
  confidence: { type: Number, default: 0.5, min: 0, max: 1 },
  status: { type: String, enum: ['RECEIVED','REVIEW_REQUIRED','LINKED','ACTIONED'], default: 'RECEIVED', index: true },
  simulationMode: { type: Boolean, default: false },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });
emergencyReportSchema.index({ location: '2dsphere' }, { sparse: true });
export const EmergencyReport = mongoose.models.EmergencyReport || model('EmergencyReport', emergencyReportSchema);
