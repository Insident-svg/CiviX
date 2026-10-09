import mongoose, { Schema, model } from 'mongoose';
const emergencyResourceSchema = new Schema({
  name: { type: String, required: true, trim: true },
  resourceType: { type: String, required: true, enum: ['RESCUE_TEAM','MEDICAL_TEAM','FIRE_TEAM','LOGISTICS_TEAM','BOAT','AMBULANCE','MEDICAL_KIT','WATER_PACK','FOOD_PACK','BLANKET','SHELTER_BED','OTHER'], index: true },
  capabilities: { type: [String], default: [] },
  quantityTotal: { type: Number, required: true, min: 0 },
  quantityAvailable: { type: Number, required: true, min: 0 },
  quantityReserved: { type: Number, default: 0, min: 0 },
  status: { type: String, enum: ['AVAILABLE','PARTIALLY_AVAILABLE','DEPLOYED','UNAVAILABLE','DEPLETED'], default: 'AVAILABLE', index: true },
  locationName: { type: String, default: '' },
  location: { type: { type: String, enum: ['Point'] }, coordinates: { type: [Number], default: undefined } },
  simulationMode: { type: Boolean, default: false, index: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });
emergencyResourceSchema.index({ location: '2dsphere' }, { sparse: true });
export const EmergencyResource = mongoose.models.EmergencyResource || model('EmergencyResource', emergencyResourceSchema);
