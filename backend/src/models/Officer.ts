import { Schema, model } from 'mongoose';

const officerSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      unique: true,
      required: true,
    },

    departmentIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Department',
      },
    ],

    wardIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Ward',
      },
    ],

    employeeId: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },

    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

export const Officer = model(
  'Officer',
  officerSchema,
);