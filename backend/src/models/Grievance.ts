import { Schema, model } from 'mongoose';

const mediaSchema = new Schema(
  {
    type: {
      type: String,
      enum: ['image', 'video', 'voice'],
      required: true,
    },

    url: {
      type: String,
      required: true,
    },

    mimeType: {
      type: String,
    },

    size: {
      type: Number,
    },
  },
  {
    _id: false,
  },
);

const confidenceSchema = new Schema(
  {
    category: {
      type: Number,
    },

    severity: {
      type: Number,
    },

    impact: {
      type: Number,
    },
  },
  {
    _id: false,
  },
);

const grievanceSchema = new Schema(
  {
    grievanceId: {
      type: String,
      unique: true,
      index: true,
    },

    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 10000,
    },

    // Public-facing heading. For typed reports this preserves the citizen's
    // input; for voice-only reports the AI generates it from the transcript.
    title: {
      type: String,
      trim: true,
      maxlength: 500,
    },

    // Short AI-generated public description; the raw report remains in `text`.
    summary: {
      type: String,
      trim: true,
      maxlength: 1000,
    },

    media: {
      type: [mediaSchema],
      default: [],
    },

    location: {
      type: {
        type: String,
        enum: ['Point'],
        required: true,
      },

      coordinates: {
        type: [Number],
        required: true,
      },
    },

    category: {
      type: String,
      index: true,
    },

    subCategory: {
      type: String,
    },

    language: {
      type: String,
    },

    severity: {
      type: String,
      index: true,
    },

    impactScore: {
      type: Number,
      index: true,
    },

    aiConfidence: {
      type: confidenceSchema,
    },

    aiHumanReview: {
      type: Boolean,
      default: false,
    },

    aiReviewReasons: {
      type: [String],
      default: [],
    },

    isEmergency: {
      type: Boolean,
      default: false,
    },

    departments: {
      type: [String],
      default: [],
    },

    masterIncidentId: {
      type: String,
      index: true,
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

    officerId: {
      type: Schema.Types.ObjectId,
      ref: 'Officer',
      index: true,
    },

    // Demo-ready POC details entered by the assigned officer for this grievance.
    poc: {
      name: { type: String, trim: true, maxlength: 100 },
      designation: { type: String, trim: true, maxlength: 100 },
      department: { type: String, trim: true, maxlength: 150 },
      officialContact: { type: String, trim: true, maxlength: 20 },
      officeHours: { type: String, trim: true, maxlength: 100 },
      assignedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      assignedAt: { type: Date },
      isDemo: { type: Boolean, default: false },
    },

    // Per-grievance consent flag. The recipient phone number is stored privately
    // on the citizen's User document and is never exposed in grievance responses.
    whatsappUpdatesEnabled: { type: Boolean, default: false },
    whatsappConsentAt: { type: Date },

    // Set when the assigned officer accepts the grievance. The public feed
    // keeps this timestamp even though the workflow immediately moves to
    // IN_PROGRESS, so citizens can see that the grievance was acknowledged.
    acknowledgedAt: {
      type: Date,
      index: true,
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

    upvoteCount: {
      type: Number,
      default: 0,
    },

    downvoteCount: {
      type: Number,
      default: 0,
    },

    commentCount: {
      type: Number,
      default: 0,
    },

    // Total community coverage used for public-feed priority:
    // upvotes + downvotes + comments.
    engagementScore: {
      type: Number,
      default: 0,
      index: true,
    },

    slaDeadline: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

grievanceSchema.index({
  location: '2dsphere',
});

grievanceSchema.index({
  createdAt: -1,
});

grievanceSchema.index({
  category: 1,
  status: 1,
  createdAt: -1,
});

export const Grievance = model(
  'Grievance',
  grievanceSchema,
);