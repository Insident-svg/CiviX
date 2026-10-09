import { Schema, model } from 'mongoose';

const wardSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },

    boundary: {
      type: {
        type: String,
        enum: ['Polygon'],
        required: true,
      },

      coordinates: {
        type: [[[Number]]],
        required: true,
      },
    },
  },
  {
    timestamps: true,
  },
);

wardSchema.index({
  boundary: '2dsphere',
});

export const Ward = model(
  'Ward',
  wardSchema,
);