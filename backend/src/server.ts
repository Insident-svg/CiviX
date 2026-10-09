import app from "./app.js";
import { env } from "./config/env.js";
import { connectDB } from "./config/db.js";
import { Vote } from "./models/Vote.js";
import { PublicPost } from "./models/PublicPost.js";
import { Comment } from "./models/Comment.js";
import { Grievance } from "./models/Grievance.js";

async function repairSocialData(): Promise<void> {
  // Clean legacy duplicate votes before the unique compound index is enforced.
  const duplicateGroups = await Vote.aggregate([
    {
      $group: {
        _id: { postId: '$postId', userId: '$userId' },
        ids: { $push: '$_id' },
        count: { $sum: 1 },
      },
    },
    { $match: { count: { $gt: 1 } } },
  ]);

  for (const group of duplicateGroups) {
    await Vote.deleteMany({ _id: { $in: group.ids.slice(1) } });
  }

  await Vote.syncIndexes();

  // Rebuild public-feed counters so old data also follows the same coverage
  // formula: upvotes + downvotes + comments.
  const posts = await PublicPost.find({}).select('_id grievanceId').lean();
  for (const post of posts) {
    const [upvotes, downvotes, comments] = await Promise.all([
      Vote.countDocuments({ postId: post._id, type: 'upvote' }),
      Vote.countDocuments({ postId: post._id, type: 'downvote' }),
      Comment.countDocuments({ postId: post._id, deleted: false }),
    ]);
    await Grievance.findByIdAndUpdate(post.grievanceId, {
      upvoteCount: upvotes,
      downvoteCount: downvotes,
      commentCount: comments,
      engagementScore: upvotes + downvotes + comments,
    });
  }
}

async function startServer(): Promise<void> {
  await connectDB();
  await repairSocialData();

  app.listen(env.PORT, () => {
    console.log(
      `Civix backend running on http://localhost:${env.PORT}`
    );
  });
}

startServer().catch((error) => {
  console.error("❌ Failed to start server");
  console.error(error);

  process.exit(1);
});