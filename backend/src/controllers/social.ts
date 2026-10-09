import { Response } from 'express';
import { Types } from 'mongoose';

import { Vote } from '../models/Vote.js';
import { Comment } from '../models/Comment.js';
import { PublicPost } from '../models/PublicPost.js';
import { Grievance } from '../models/Grievance.js';

import { AuthRequest } from '../types/index.js';
import { AppError, ok } from '../utils/http.js';

export async function getVotes(
  req: AuthRequest,
  res: Response,
) {
  if (!req.user) {
    throw new AppError(
      401,
      'UNAUTHORIZED',
      'Authentication required',
    );
  }

  const postId =
    String(req.query.postId ?? '');

  if (!postId) {
    throw new AppError(
      400,
      'INVALID_POST_ID',
      'postId is required',
    );
  }

  const post =
    await PublicPost.findById(
      postId,
    ).select('_id');

  if (!post) {
    throw new AppError(
      404,
      'POST_NOT_FOUND',
      'Post not found',
    );
  }

  const [
    upvotes,
    downvotes,
    myVote,
  ] = await Promise.all([
    Vote.countDocuments({
      postId: post._id,
      type: 'upvote',
    }),

    Vote.countDocuments({
      postId: post._id,
      type: 'downvote',
    }),

    Vote.findOne({
      postId: post._id,
      userId: req.user.id,
    }).select('type'),
  ]);

  return ok(res, {
    upvotes,
    downvotes,
    myVote:
      myVote?.type ?? null,
  });
}

export async function vote(
  req: AuthRequest,
  res: Response,
) {
  if (!req.user) {
    throw new AppError(
      401,
      'UNAUTHORIZED',
      'Authentication required',
    );
  }

  const {
    postId,
    type,
  } = req.body;

  if (
    typeof postId !== 'string'
  ) {
    throw new AppError(
      400,
      'INVALID_POST_ID',
      'postId is required',
    );
  }

  if (
    type !== 'upvote' &&
    type !== 'downvote'
  ) {
    throw new AppError(
      400,
      'INVALID_VOTE',
      'Vote must be upvote or downvote',
    );
  }

  const post =
    await PublicPost.findById(
      postId,
    );

  if (!post) {
    throw new AppError(
      404,
      'POST_NOT_FOUND',
      'Post not found',
    );
  }

  let unchanged = false;
  try {
    const existing = await Vote.findOne({
      postId: post._id,
      userId: req.user.id,
    }).select('type');

    if (existing?.type === type) {
      unchanged = true;
    } else {
      // The compound unique index guarantees one vote per user/post.
      // Upsert also avoids a read-then-create race under rapid double clicks.
      await Vote.findOneAndUpdate(
        { postId: post._id, userId: req.user.id },
        { $set: { type } },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
    }
  } catch (error: any) {
    if (error?.code === 11000) {
      // Another request won the race; make the user's requested vote the
      // final state rather than creating a second record.
      await Vote.findOneAndUpdate(
        { postId: post._id, userId: req.user.id },
        { $set: { type } },
        { new: true },
      );
    } else {
      throw error;
    }
  }

  const counters = await syncCounters(post.grievanceId);

  return ok(res, {
    type,
    unchanged,
    ...counters,
  });
}

export async function removeVote(
  req: AuthRequest,
  res: Response,
) {
  if (!req.user) {
    throw new AppError(
      401,
      'UNAUTHORIZED',
      'Authentication required',
    );
  }

  const postId =
    String(req.query.postId ?? '');

  if (!postId) {
    throw new AppError(
      400,
      'INVALID_POST_ID',
      'postId is required',
    );
  }

  const post =
    await PublicPost.findById(
      postId,
    );

  if (!post) {
    throw new AppError(
      404,
      'POST_NOT_FOUND',
      'Post not found',
    );
  }

  const result =
    await Vote.deleteOne({
      postId: post._id,
      userId: req.user.id,
    });

  const counters = await syncCounters(post.grievanceId);

  return ok(res, {
    removed: result.deletedCount > 0,
    ...counters,
  });
}

async function syncCounters(
  grievanceId: string | Types.ObjectId,
) {
  const post =
    await PublicPost.findOne({
      grievanceId,
    }).select('_id');

  if (!post) {
    return;
  }

  const [
    upvotes,
    downvotes,
    comments,
  ] = await Promise.all([
    Vote.countDocuments({
      postId: post._id,
      type: 'upvote',
    }),

    Vote.countDocuments({
      postId: post._id,
      type: 'downvote',
    }),

    Comment.countDocuments({
      postId: post._id,
      deleted: false,
    }),
  ]);

  const engagementScore =
    upvotes +
    downvotes +
    comments;

  await Grievance.findByIdAndUpdate(
    grievanceId,
    {
      upvoteCount: upvotes,
      downvoteCount: downvotes,
      commentCount: comments,
      engagementScore,
    },
  );

  return {
    upvotes,
    downvotes,
    commentCount: comments,
    engagementScore,
  };
}

export async function comments(
  req: AuthRequest,
  res: Response,
) {
  const postId =
    String(req.query.postId ?? '');

  if (!postId) {
    throw new AppError(
      400,
      'INVALID_POST_ID',
      'postId is required',
    );
  }

  const post =
    await PublicPost.findById(
      postId,
    ).select('_id');

  if (!post) {
    throw new AppError(
      404,
      'POST_NOT_FOUND',
      'Post not found',
    );
  }

  const page = Math.max(
    1,
    Number(req.query.page ?? 1),
  );

  const limit = Math.min(
    50,
    Math.max(
      1,
      Number(
        req.query.limit ?? 20,
      ),
    ),
  );

  const items =
    await Comment.find({
      postId: post._id,
      deleted: false,
    })
      .sort({
        createdAt: -1,
      })
      .skip(
        (page - 1) * limit,
      )
      .limit(limit)
      .populate(
        'userId',
        'name username profileImage',
      )
      .lean();

  return ok(res, {
    items,
    page,
    limit,
    nextPage:
      items.length === limit
        ? page + 1
        : null,
  });
}

export async function addComment(
  req: AuthRequest,
  res: Response,
) {
  if (!req.user) {
    throw new AppError(
      401,
      'UNAUTHORIZED',
      'Authentication required',
    );
  }

  const {
    postId,
    text,
  } = req.body;

  if (
    typeof postId !== 'string'
  ) {
    throw new AppError(
      400,
      'INVALID_POST_ID',
      'postId is required',
    );
  }

  if (
    typeof text !== 'string'
  ) {
    throw new AppError(
      400,
      'INVALID_COMMENT',
      'Comment is required',
    );
  }

  const cleanedText =
    text.trim();

  if (
    cleanedText.length < 1 ||
    cleanedText.length > 2000
  ) {
    throw new AppError(
      400,
      'INVALID_COMMENT',
      'Comment must be between 1 and 2000 characters',
    );
  }

  const post =
    await PublicPost.findById(
      postId,
    );

  if (!post) {
    throw new AppError(
      404,
      'POST_NOT_FOUND',
      'Post not found',
    );
  }

  const comment =
    await Comment.create({
      postId: post._id,
      userId: req.user.id,
      text: cleanedText,
    });

  await syncCounters(
    post.grievanceId,
  );

  const populatedComment =
    await Comment.findById(
      comment._id,
    ).populate(
      'userId',
      'name username profileImage',
    );

  return ok(
    res,
    populatedComment,
    201,
  );
}

export async function deleteComment(
  req: AuthRequest,
  res: Response,
) {
  if (!req.user) {
    throw new AppError(
      401,
      'UNAUTHORIZED',
      'Authentication required',
    );
  }

  const commentId =
    String(req.query.id ?? '');

  if (!commentId) {
    throw new AppError(
      400,
      'INVALID_COMMENT_ID',
      'Comment id is required',
    );
  }

  const comment =
    await Comment.findById(
      commentId,
    );

  if (!comment) {
    throw new AppError(
      404,
      'COMMENT_NOT_FOUND',
      'Comment not found',
    );
  }

  const isOwner =
    String(comment.userId) ===
    req.user.id;

  const isAdmin =
    req.user.role === 'admin';

  if (!isOwner && !isAdmin) {
    throw new AppError(
      403,
      'FORBIDDEN',
      'Cannot delete this comment',
    );
  }

  if (comment.deleted) {
    return ok(res, {
      deleted: true,
      unchanged: true,
    });
  }

  comment.deleted = true;

  await comment.save();

  // Fetch the post document directly. We only need grievanceId here, and
  // avoiding a query-chain-only `.select()` also keeps this path compatible
  // with lightweight model mocks used by tests.
  const post =
    await PublicPost.findById(
      comment.postId,
    );

  if (post) {
    await syncCounters(
      post.grievanceId,
    );
  }

  return ok(res, {
    deleted: true,
  });
}