import { Schema, model } from 'mongoose';

const resolutionEvidenceSchema = new Schema(
  {
    grievanceId: {
      type: Schema.Types.ObjectId,
      ref: 'Grievance',
      required: true,
      index: true,
    },

    officerId: {
      type: Schema.Types.ObjectId,
      ref: 'Officer',
      required: true,
      index: true,
    },

    beforeUrl: {
      type: String,
      trim: true,
    },

    afterUrl: {
      type: String,
      trim: true,
    },

    gps: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },

      coordinates: {
        type: [Number],
        validate: {
          validator: (value: number[]) =>
            value.length === 2 &&
            value[0] >= -180 &&
            value[0] <= 180 &&
            value[1] >= -90 &&
            value[1] <= 90,

          message:
            'Coordinates must be [longitude, latitude]',
        },
      },
    },

    resolutionDescription: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000,
    },

    capturedAt: {
      type: Date,
      default: Date.now,
    },

    verified: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

resolutionEvidenceSchema.index({
  gps: '2dsphere',
});

resolutionEvidenceSchema.index({
  grievanceId: 1,
  createdAt: -1,
});

resolutionEvidenceSchema.index({
  officerId: 1,
  createdAt: -1,
});

export const ResolutionEvidence = model(
  'ResolutionEvidence',
  resolutionEvidenceSchema,
);