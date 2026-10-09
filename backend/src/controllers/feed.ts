import { Response } from 'express';

import { Grievance } from '../models/Grievance.js';
import { PublicPost } from '../models/PublicPost.js';
import { Vote } from '../models/Vote.js';

import { AuthRequest } from '../types/index.js';
import { AppError, ok } from '../utils/http.js';

export async function feed(
  req: AuthRequest,
  res: Response,
) {
  const query: Record<
    string,
    unknown
  > = {};

  if (req.query.category) {
    query.category =
      String(req.query.category);
  }

  if (req.query.status) {
    query.status =
      String(req.query.status);
  }

  if (req.query.ward) {
    query.wardId =
      String(req.query.ward);
  }

  if (req.query.department) {
    query.departments = String(req.query.department);
  }

  if (req.query.search) {
    const search = String(req.query.search).trim();
    if (search) {
      // Escape regex metacharacters so normal searches such as "C++" or "[road]"
      // cannot break MongoDB regex evaluation. Text, grievance ID and category are
      // indexed/denormalized fields available directly on Grievance. Department and
      // ward names are populated after filtering, so they are handled client-side.
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { text: { $regex: escaped, $options: 'i' } },
        { grievanceId: { $regex: escaped, $options: 'i' } },
        { category: { $regex: escaped, $options: 'i' } },
        { subCategory: { $regex: escaped, $options: 'i' } },
        { departments: { $regex: escaped, $options: 'i' } },
      ];
    }
  }

  if (
    req.query.lat !== undefined &&
    req.query.lng !== undefined &&
    req.query.type === 'nearby'
  ) {
    const latitude =
      Number(req.query.lat);

    const longitude =
      Number(req.query.lng);

    const radius =
      Number(
        req.query.radius ?? 5000,
      );

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      !Number.isFinite(radius) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180 ||
      radius <= 0
    ) {
      throw new AppError(
        400,
        'INVALID_LOCATION',
        'Invalid location or radius',
      );
    }

    query.location = {
      $near: {
        $geometry: {
          type: 'Point',

          coordinates: [
            longitude,
            latitude,
          ],
        },

        $maxDistance: radius,
      },
    };
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

  // Public-feed priority is based on total community coverage. Nearby
  // queries must keep MongoDB's geo ordering; all normal public-feed views
  // use engagement first, then impact and recency as tie-breakers.
  const isNearby = req.query.type === 'nearby';
  const sort: Record<string, 1 | -1> =
    !isNearby && (req.query.sort === 'engagement' || !req.query.sort)
      ? {
          engagementScore: -1,
          impactScore: -1,
          createdAt: -1,
        }
      : {
          createdAt: -1,
        };

  const items =
    await Grievance.find(query)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .populate(
        'userId',
        'name username profileImage',
      )
      .populate(
        'departmentId',
        'name code',
      )
      .populate(
        'wardId',
        'name code',
      )
      .lean();

  const itemIds = items.map(item => item._id);
  const postIds = await PublicPost.find({ grievanceId: { $in: itemIds } })
    .select('_id grievanceId')
    .lean();
  const postByGrievance = new Map(postIds.map(post => [String(post.grievanceId), String(post._id)]));

  const voteRows = req.user && postIds.length
    ? await Vote.find({
        postId: { $in: postIds.map(post => post._id) },
        userId: req.user.id,
      }).select('postId type').lean()
    : [];
  const voteByPost = new Map(voteRows.map(vote => [String(vote.postId), vote.type]));

  const enrichedItems = items.map(item => {
    const postId = postByGrievance.get(String(item._id)) ?? null;
    return {
      ...item,
      postId,
      myVote: postId ? voteByPost.get(postId) ?? null : null,
    };
  });

  return ok(res, {
    items: enrichedItems,

    page,

    limit,

    nextPage:
      items.length === limit
        ? page + 1
        : null,
  });
}

export async function posts(
  req: AuthRequest,
  res: Response,
) {
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

  const posts =
    await PublicPost.find({
      visibility: 'public',
      moderated: false,
    })
      .populate(
        'authorId',
        'name username profileImage',
      )
      .populate({
        path: 'grievanceId',

        populate: [
          {
            path: 'userId',
            select:
              'name username profileImage',
          },

          {
            path: 'departmentId',
            select: 'name code',
          },

          {
            path: 'wardId',
            select: 'name code',
          },
        ],
      })
      .sort({
        publishedAt: -1,
      })
      .skip(
        (page - 1) * limit,
      )
      .limit(limit)
      .lean();

  return ok(res, {
    items: posts,

    page,

    limit,

    nextPage:
      posts.length === limit
        ? page + 1
        : null,
  });
}