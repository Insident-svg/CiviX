import { Schema, model } from 'mongoose';

const auditLogSchema = new Schema(
  {
    actorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false,
      index: true,
    },

    actorRole: {
      type: String,
      enum: ['citizen', 'officer', 'admin', 'system'],
      required: true,
      index: true,
    },

    action: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
      index: true,
    },

    grievanceId: {
      type: Schema.Types.ObjectId,
      ref: 'Grievance',
      index: true,
    },

    previousStatus: {
      type: String,
      trim: true,
    },

    newStatus: {
      type: String,
      trim: true,
    },

    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  },
);

auditLogSchema.index({
  grievanceId: 1,
  createdAt: -1,
});

auditLogSchema.index({
  actorId: 1,
  createdAt: -1,
});

export const AuditLog = model(
  'AuditLog',
  auditLogSchema,
);