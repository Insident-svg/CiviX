import { Schema, model } from 'mongoose';

// Keep GPS as an optional single nested document. A plain nested object with
// defaults can be materialized as { type: 'Point' } even when no coordinates
// were supplied, which makes MongoDB's 2dsphere index reject the document.

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
      type: new Schema(
        {
          type: {
            type: String,
            enum: ['Point'],
            required: true,
          },
          coordinates: {
            type: [Number],
            required: true,
            validate: {
              validator: (value: number[]) =>
                value.length === 2 &&
                value[0] >= -180 &&
                value[0] <= 180 &&
                value[1] >= -90 &&
                value[1] <= 90,
              message: 'Coordinates must be [longitude, latitude]',
            },
          },
        },
        { _id: false },
      ),
      default: undefined,
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