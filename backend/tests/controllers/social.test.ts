/**
 * Tests for src/controllers/social.ts
 * Covers: getVotes(), vote(), removeVote(), comments(), addComment(), deleteComment()
 */
import {
  describe,
  it,
  expect,
  vi,
  beforeAll,
  afterEach,
} from 'vitest';

beforeAll(() => {
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = 'mongodb://localhost:27017/test';
  process.env.JWT_SECRET = 'super-secret-key-that-is-at-least-32-chars!!';
  process.env.JWT_EXPIRES_IN = '7d';
  process.env.FRONTEND_URL = 'http://localhost:3000';
  process.env.BACKEND_URL = 'http://localhost:5000';
  process.env.AI_SERVICE_URL = 'http://localhost:8000';
  process.env.CLOUDINARY_CLOUD_NAME = 'test-cloud';
  process.env.CLOUDINARY_API_KEY = 'test-key';
  process.env.CLOUDINARY_API_SECRET = 'test-secret';
    });

vi.mock('../../src/models/Vote.js', () => ({
  Vote: {
    countDocuments: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn(),
    deleteOne: vi.fn(),
  },
}));

vi.mock('../../src/models/Comment.js', () => ({
  Comment: {
    find: vi.fn(),
    create: vi.fn(),
    findById: vi.fn(),
    countDocuments: vi.fn(),
  },
}));

vi.mock('../../src/models/PublicPost.js', () => ({
  PublicPost: {
    findById: vi.fn(),
    findOne: vi.fn(),
  },
}));

vi.mock('../../src/models/Grievance.js', () => ({
  Grievance: {
    findByIdAndUpdate: vi.fn(),
  },
}));

function makeRes() {
  const json = vi.fn().mockReturnThis();
  const status = vi.fn().mockReturnValue({ json });
  return { status, json };
}

function makePost(overrides = {}) {
  return { _id: 'post-1', grievanceId: 'grv-1', ...overrides };
}

describe('getVotes()', async () => {
  const { Vote } = await import('../../src/models/Vote.js');
  const { PublicPost } = await import('../../src/models/PublicPost.js');
  const { getVotes } = await import('../../src/controllers/social.js');

  afterEach(() => vi.clearAllMocks());

  it('throws 401 when no user', async () => {
    await expect(getVotes({} as any, makeRes() as any)).rejects.toMatchObject({ status: 401 });
  });

  it('throws 400 when postId missing', async () => {
    const req = { user: { id: 'u1', role: 'citizen' }, query: {} } as any;
    await expect(getVotes(req, makeRes() as any)).rejects.toMatchObject({ status: 400, code: 'INVALID_POST_ID' });
  });

  it('throws 404 when post not found', async () => {
    const chain = { select: vi.fn().mockResolvedValue(null) };
    vi.mocked(PublicPost.findById).mockReturnValueOnce(chain as any);
    const req = { user: { id: 'u1', role: 'citizen' }, query: { postId: 'missing' } } as any;
    await expect(getVotes(req, makeRes() as any)).rejects.toMatchObject({ status: 404 });
  });

  it('returns vote counts', async () => {
    const chain = { select: vi.fn().mockResolvedValue(makePost()) };
    vi.mocked(PublicPost.findById).mockReturnValueOnce(chain as any);
    vi.mocked(Vote.countDocuments).mockResolvedValueOnce(5 as any); // upvotes
    vi.mocked(Vote.countDocuments).mockResolvedValueOnce(2 as any); // downvotes
    const voteChain = { select: vi.fn().mockResolvedValue({ type: 'upvote' }) };
    vi.mocked(Vote.findOne).mockReturnValueOnce(voteChain as any);
    const req = { user: { id: 'u1', role: 'citizen' }, query: { postId: 'post-1' } } as any;
    const res = makeRes();
    await getVotes(req, res as any);
    const body = res.status.mock.results[0].value.json.mock.calls[0][0];
    expect(body.data.upvotes).toBe(5);
    expect(body.data.downvotes).toBe(2);
    expect(body.data.myVote).toBe('upvote');
  });
});

describe('vote()', async () => {
  const { Vote } = await import('../../src/models/Vote.js');
  const { PublicPost } = await import('../../src/models/PublicPost.js');
  const { vote } = await import('../../src/controllers/social.js');

  afterEach(() => vi.clearAllMocks());

  it('throws 401 when no user', async () => {
    await expect(vote({} as any, makeRes() as any)).rejects.toMatchObject({ status: 401 });
  });

  it('throws 400 when postId is not a string', async () => {
    const req = { user: { id: 'u1', role: 'citizen' }, body: { type: 'upvote' } } as any;
    await expect(vote(req, makeRes() as any)).rejects.toMatchObject({ status: 400, code: 'INVALID_POST_ID' });
  });

  it('throws 400 when vote type is invalid', async () => {
    const req = { user: { id: 'u1', role: 'citizen' }, body: { postId: 'p1', type: 'sidewayvote' } } as any;
    await expect(vote(req, makeRes() as any)).rejects.toMatchObject({ status: 400, code: 'INVALID_VOTE' });
  });

  it('returns unchanged:true when same vote already exists', async () => {
    vi.mocked(PublicPost.findById).mockResolvedValueOnce(makePost() as any);
    vi.mocked(Vote.findOne).mockResolvedValueOnce({ type: 'upvote' } as any);
    const req = { user: { id: 'u1', role: 'citizen' }, body: { postId: 'post-1', type: 'upvote' } } as any;
    const res = makeRes();
    await vote(req, res as any);
    const body = res.status.mock.results[0].value.json.mock.calls[0][0];
    expect(body.data.unchanged).toBe(true);
  });

  it('creates a new vote', async () => {
    vi.mocked(PublicPost.findById).mockResolvedValueOnce(makePost() as any);
    vi.mocked(Vote.findOne).mockResolvedValueOnce(null);
    vi.mocked(Vote.create).mockResolvedValueOnce({} as any);
    // syncCounters uses PublicPost.findOne and Vote.countDocuments x2
    const postChain = { select: vi.fn().mockResolvedValue(makePost()) };
    vi.mocked(PublicPost.findOne).mockReturnValueOnce(postChain as any);
    vi.mocked(Vote.countDocuments).mockResolvedValue(1 as any);
    const { Comment } = await import('../../src/models/Comment.js');
    vi.mocked(Comment.countDocuments).mockResolvedValueOnce(0 as any);
    const { Grievance } = await import('../../src/models/Grievance.js');
    vi.mocked(Grievance.findByIdAndUpdate).mockResolvedValueOnce(null);
    const req = { user: { id: 'u1', role: 'citizen' }, body: { postId: 'post-1', type: 'upvote' } } as any;
    const res = makeRes();
    await vote(req, res as any);
    const body = res.status.mock.results[0].value.json.mock.calls[0][0];
    expect(body.data.type).toBe('upvote');
  });
});

describe('addComment()', async () => {
  const { Comment } = await import('../../src/models/Comment.js');
  const { Vote } = await import('../../src/models/Vote.js');
  const { PublicPost } = await import('../../src/models/PublicPost.js');
  const { addComment } = await import('../../src/controllers/social.js');

  afterEach(() => vi.clearAllMocks());

  it('throws 401 when no user', async () => {
    await expect(addComment({} as any, makeRes() as any)).rejects.toMatchObject({ status: 401 });
  });

  it('throws 400 when text is empty after trim', async () => {
    vi.mocked(PublicPost.findById).mockResolvedValueOnce(makePost() as any);
    const req = {
      user: { id: 'u1', role: 'citizen' },
      body: { postId: 'p1', text: '   ' },
    } as any;
    await expect(addComment(req, makeRes() as any)).rejects.toMatchObject({ status: 400 });
  });

  it('creates and returns a comment', async () => {
    vi.mocked(PublicPost.findById).mockResolvedValueOnce(makePost() as any);
    const commentDoc = { _id: 'c-1', text: 'Good point', postId: 'post-1' };
    vi.mocked(Comment.create).mockResolvedValueOnce(commentDoc as any);
    // syncCounters
    const postChain = { select: vi.fn().mockResolvedValue(makePost()) };
    vi.mocked(PublicPost.findOne).mockReturnValueOnce(postChain as any);
    vi.mocked(Vote.countDocuments as any).mockResolvedValue(0);
    vi.mocked(Comment.countDocuments).mockResolvedValueOnce(1 as any);
    const { Grievance } = await import('../../src/models/Grievance.js');
    vi.mocked(Grievance.findByIdAndUpdate).mockResolvedValueOnce(null);
    // populatedComment
    const populateChain = { populate: vi.fn().mockResolvedValue({ ...commentDoc, userId: { name: 'User' } }) };
    vi.mocked(Comment.findById).mockReturnValueOnce(populateChain as any);

    const req = {
      user: { id: 'u1', role: 'citizen' },
      body: { postId: 'post-1', text: 'Good point' },
    } as any;
    const res = makeRes();
    await addComment(req, res as any);
    expect(res.status).toHaveBeenCalledWith(201);
  });
});

describe('deleteComment()', async () => {
  const { Comment } = await import('../../src/models/Comment.js');
  const { Vote } = await import('../../src/models/Vote.js');
  const { PublicPost } = await import('../../src/models/PublicPost.js');
  const { deleteComment } = await import('../../src/controllers/social.js');

  afterEach(() => vi.clearAllMocks());

  it('throws 400 when comment id is missing', async () => {
    const req = { user: { id: 'u1', role: 'citizen' }, query: {} } as any;
    await expect(deleteComment(req, makeRes() as any)).rejects.toMatchObject({ status: 400, code: 'INVALID_COMMENT_ID' });
  });

  it('throws 404 when comment not found', async () => {
    vi.mocked(Comment.findById).mockResolvedValueOnce(null);
    const req = { user: { id: 'u1', role: 'citizen' }, query: { id: 'missing' } } as any;
    await expect(deleteComment(req, makeRes() as any)).rejects.toMatchObject({ status: 404 });
  });

  it('throws 403 when non-owner, non-admin tries to delete', async () => {
    const commentDoc = { _id: 'c-1', userId: 'other-user', deleted: false };
    vi.mocked(Comment.findById).mockResolvedValueOnce(commentDoc as any);
    const req = { user: { id: 'u1', role: 'citizen' }, query: { id: 'c-1' } } as any;
    await expect(deleteComment(req, makeRes() as any)).rejects.toMatchObject({ status: 403 });
  });

  it('returns deleted:true, unchanged:true when already deleted', async () => {
    const commentDoc = { _id: 'c-1', userId: 'u1', deleted: true };
    vi.mocked(Comment.findById).mockResolvedValueOnce(commentDoc as any);
    const req = { user: { id: 'u1', role: 'citizen' }, query: { id: 'c-1' } } as any;
    const res = makeRes();
    await deleteComment(req, res as any);
    const body = res.status.mock.results[0].value.json.mock.calls[0][0];
    expect(body.data.deleted).toBe(true);
    expect(body.data.unchanged).toBe(true);
  });

  it('soft-deletes comment and syncs counters', async () => {
    const commentDoc = {
      _id: 'c-1',
      userId: 'u1',
      deleted: false,
      postId: 'post-1',
      save: vi.fn().mockResolvedValue(undefined),
    };
    vi.mocked(Comment.findById).mockResolvedValueOnce(commentDoc as any);

    // deleteComment calls PublicPost.findById(comment.postId).select('grievanceId')
    const postForDelete = makePost();
    const deleteChain = { select: vi.fn().mockResolvedValue(postForDelete) };
    vi.mocked(PublicPost.findById).mockReturnValueOnce(deleteChain as any);

    // syncCounters: PublicPost.findOne(...).select('_id')
    const syncChain = { select: vi.fn().mockResolvedValue(makePost()) };
    vi.mocked(PublicPost.findOne).mockReturnValueOnce(syncChain as any);
    vi.mocked(Vote.countDocuments as any).mockResolvedValue(0);
    vi.mocked(Comment.countDocuments).mockResolvedValueOnce(0 as any);
    const { Grievance } = await import('../../src/models/Grievance.js');
    vi.mocked(Grievance.findByIdAndUpdate).mockResolvedValueOnce(null);

    const req = { user: { id: 'u1', role: 'citizen' }, query: { id: 'c-1' } } as any;
    const res = makeRes();
    await deleteComment(req, res as any);
    expect(commentDoc.deleted).toBe(true);
    expect(commentDoc.save).toHaveBeenCalled();
    const body = res.status.mock.results[0].value.json.mock.calls[0][0];
    expect(body.data.deleted).toBe(true);
  });
});
