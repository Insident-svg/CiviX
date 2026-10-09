import { Schema, model } from 'mongoose';

const voteSchema = new Schema(
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

    type: {
      type: String,
      enum: ['upvote', 'downvote'],
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

voteSchema.index(
  {
    postId: 1,
    userId: 1,
  },
  {
    unique: true,
  },
);

voteSchema.index({
  postId: 1,
  type: 1,
});

export const Vote = model(
  'Vote',
  voteSchema,
);