import { Schema, model } from 'mongoose';

const publicPostSchema = new Schema(
  {
    grievanceId: {
      type: Schema.Types.ObjectId,
      ref: 'Grievance',
      unique: true,
      required: true,
      index: true,
    },

    authorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    visibility: {
      type: String,
      enum: ['public', 'private'],
      default: 'public',
      index: true,
    },

    publishedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },

    moderated: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

publicPostSchema.index({
  visibility: 1,
  moderated: 1,
  publishedAt: -1,
});

export const PublicPost = model(
  'PublicPost',
  publicPostSchema,
);