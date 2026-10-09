import { Schema, model } from 'mongoose';

const notificationSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // Audience role is stored as an extra safety/auditing signal.
    // userId remains the primary isolation boundary.
    recipientRole: {
      type: String,
      enum: ['citizen', 'officer', 'admin'],
      index: true,
    },

    type: {
      type: String,
      enum: [
        'grievance',
        'status',
        'assignment',
        'resolution',
        'verification',
        'dispute',
        'system',
      ],
      default: 'grievance',
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },

    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },

    grievanceId: {
      type: Schema.Types.ObjectId,
      ref: 'Grievance',
      index: true,
    },

    read: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

notificationSchema.index({
  userId: 1,
  read: 1,
  createdAt: -1,
});

notificationSchema.index({
  userId: 1,
  createdAt: -1,
});

export const Notification = model(
  'Notification',
  notificationSchema,
);