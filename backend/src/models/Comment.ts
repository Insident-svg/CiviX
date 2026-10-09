import { Schema, model } from 'mongoose';

const commentSchema = new Schema(
  {
    postId: {
      type: Schema.Types.ObjectId,
      ref: 'PublicPost',
      required: true,
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
      minlength: 1,
      maxlength: 2000,
    },

    deleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

commentSchema.index({
  postId: 1,
  deleted: 1,
  createdAt: -1,
});

commentSchema.index({
  userId: 1,
  createdAt: -1,
});

export const Comment = model(
  'Comment',
  commentSchema,
);