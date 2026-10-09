import { Schema, model } from 'mongoose';

/** Immutable ledger: one reward per grievance, even if a resolution is reopened. */
const gamificationEventSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  grievanceId: { type: Schema.Types.ObjectId, ref: 'Grievance', required: true, unique: true, index: true },
  points: { type: Number, required: true, min: 0 },
  reason: { type: String, enum: ['verified_resolution'], required: true },
  awardedAt: { type: Date, default: Date.now, required: true },
}, { timestamps: true });

gamificationEventSchema.index({ userId: 1, awardedAt: -1 });
export const GamificationEvent = model('GamificationEvent', gamificationEventSchema);
