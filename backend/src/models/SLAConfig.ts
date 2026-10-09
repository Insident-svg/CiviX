import { Schema, model } from 'mongoose';

const slaConfigSchema = new Schema(
  {
    severity: {
      type: String,
      enum: [
        'low',
        'medium',
        'high',
        'critical',
      ],
      required: true,
      index: true,
    },

    departmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
      index: true,
    },

    hours: {
      type: Number,
      required: true,
      min: 1,
    },

    active: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

slaConfigSchema.index({
  severity: 1,
  departmentId: 1,
  active: 1,
});

export const SLAConfig = model(
  'SLAConfig',
  slaConfigSchema,
);