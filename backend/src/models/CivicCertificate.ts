import { Schema, model } from 'mongoose';

const civicCertificateSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  code: { type: String, required: true, unique: true, index: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  resolvedReports: { type: Number, required: true },
  pointsAtIssue: { type: Number, required: true },
  issuedAt: { type: Date, default: Date.now, required: true },
}, { timestamps: true });

civicCertificateSchema.index({ userId: 1, resolvedReports: 1 }, { unique: true });
export const CivicCertificate = model('CivicCertificate', civicCertificateSchema);
