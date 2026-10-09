import { Schema, model } from 'mongoose';

const masterIncidentSchema = new Schema(
  {
    incidentId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },

    category: {
      type: String,
      trim: true,
      index: true,
    },

    location: {
      type: {
        type: String,
        enum: ['Point'],
        required: true,
        default: 'Point',
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

          message:
            'Coordinates must be [longitude, latitude]',
        },
      },
    },

    wardId: {
      type: Schema.Types.ObjectId,
      ref: 'Ward',
      index: true,
    },

    departmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
      index: true,
    },

    linkedGrievances: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Grievance',
      },
    ],

    reportCount: {
      type: Number,
      default: 1,
      min: 0,
    },

    impactScore: {
      type: Number,
      default: 0,
      min: 0,
    },

    engagementScore: {
      type: Number,
      default: 0,
      min: 0,
    },

    status: {
      type: String,
      enum: [
        'SUBMITTED',
        'AI_PROCESSED',
        'ASSIGNED',
        'ACKNOWLEDGED',
        'IN_PROGRESS',
        'RESOLUTION_SUBMITTED',
        'VERIFICATION',
        'RESOLVED',
        'REOPENED',
        'REJECTED',
      ],
      default: 'SUBMITTED',
      index: true,
    },

    officerId: {
      type: Schema.Types.ObjectId,
      ref: 'Officer',
      index: true,
    },

    slaDeadline: {
      type: Date,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

masterIncidentSchema.index({
  location: '2dsphere',
});

masterIncidentSchema.index({
  category: 1,
  status: 1,
  createdAt: -1,
});

masterIncidentSchema.index({
  wardId: 1,
  status: 1,
});

export const MasterIncident = model(
  'MasterIncident',
  masterIncidentSchema,
);