import { Router } from 'express';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Friendship from '../models/Friendship.js';
import { requireAuth } from '../middleware/auth.js';
import { emitToUser } from '../socket/index.js';

const router = Router();

// GET /api/friends/search?q=username -> find people to add, tagged with relationship status
router.get('/search', requireAuth, async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q) return res.json([]);

    const users = await User.find({
      _id: { $ne: req.userId },
      username: { $regex: q, $options: 'i' },
    })
      .select('username avatar lastSeen verified')
      .limit(15);

    const results = await Promise.all(
      users.map(async (u) => {
        const relation = await Friendship.findBetween(req.userId, u._id);
        let status = 'none';
        if (relation) {
          if (relation.status === 'accepted') status = 'friends';
          else if (relation.status === 'pending') {
            status = String(relation.requester) === String(req.userId) ? 'pending_sent' : 'pending_received';
          }
        }
        return {
          _id: u._id,
          username: u.username,
          avatar: u.avatar,
          lastSeen: u.lastSeen,
          verified: u.verified,
          status,
        };
      })
    );

    res.json(results);
  } catch (err) {
    res.status(500).json({ message: 'Search failed' });
  }
});

// POST /api/friends/request  { username } -> send a friend request
router.post('/request', requireAuth, async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) return res.status(400).json({ message: 'Username is required' });

    const target = await User.findOne({ username: username.toLowerCase().trim() });
    if (!target) return res.status(404).json({ message: 'User not found' });
    if (String(target._id) === String(req.userId)) {
      return res.status(400).json({ message: "You can't add yourself" });
    }

    const existing = await Friendship.findBetween(req.userId, target._id);
    if (existing) {
      if (existing.status === 'accepted') return res.status(409).json({ message: 'Already friends' });
      if (existing.status === 'pending') return res.status(409).json({ message: 'Request already pending' });
    }

    const request = await Friendship.create({
      requester: req.userId,
      recipient: target._id,
      status: 'pending',
    });

    const populated = await request.populate('requester', 'username avatar');
    emitToUser(req.app.locals.io, target._id, 'friend_request_received', {
      _id: populated._id,
      requester: populated.requester,
      status: populated.status,
      createdAt: populated.createdAt,
    });

    res.status(201).json({ message: 'Friend request sent' });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'Request already exists' });
    }
    res.status(500).json({ message: 'Could not send request' });
  }
});

// GET /api/friends/requests/incoming -> pending requests sent to me
router.get('/requests/incoming', requireAuth, async (req, res) => {
  try {
    const requests = await Friendship.find({ recipient: req.userId, status: 'pending' })
      .populate('requester', 'username avatar')
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: 'Could not load requests' });
  }
});

// GET /api/friends/requests/outgoing -> pending requests I sent, awaiting response
router.get('/requests/outgoing', requireAuth, async (req, res) => {
  try {
    const requests = await Friendship.find({ requester: req.userId, status: 'pending' })
      .populate('recipient', 'username avatar')
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: 'Could not load requests' });
  }
});

// POST /api/friends/requests/:id/accept
router.post('/requests/:id/accept', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: 'Invalid id' });

    const request = await Friendship.findById(id);
    if (!request) return res.status(404).json({ message: 'Request not found' });
    if (String(request.recipient) !== String(req.userId)) {
      return res.status(403).json({ message: 'Not your request to accept' });
    }
    if (request.status !== 'pending') {
      return res.status(409).json({ message: 'Request already resolved' });
    }

    request.status = 'accepted';
    await request.save();

    const me = await User.findById(req.userId).select('username avatar lastSeen');
    emitToUser(req.app.locals.io, request.requester, 'friend_request_accepted', {
      _id: me._id,
      username: me.username,
      avatar: me.avatar,
      lastSeen: me.lastSeen,
    });

    res.json({ message: 'Friend request accepted' });
  } catch (err) {
    res.status(500).json({ message: 'Could not accept request' });
  }
});

// POST /api/friends/requests/:id/decline
router.post('/requests/:id/decline', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: 'Invalid id' });

    const request = await Friendship.findById(id);
    if (!request) return res.status(404).json({ message: 'Request not found' });
    if (String(request.recipient) !== String(req.userId)) {
      return res.status(403).json({ message: 'Not your request to decline' });
    }

    await request.deleteOne();
    res.json({ message: 'Friend request declined' });
  } catch (err) {
    res.status(500).json({ message: 'Could not decline request' });
  }
});

// GET /api/friends -> my accepted friends, ready to chat with
router.get('/', requireAuth, async (req, res) => {
  try {
    const friendships = await Friendship.find({
      status: 'accepted',
      $or: [{ requester: req.userId }, { recipient: req.userId }],
    })
      .populate('requester', 'username avatar lastSeen verified')
      .populate('recipient', 'username avatar lastSeen verified');

    const friends = friendships.map((f) => {
      const isRequester = String(f.requester._id) === String(req.userId);
      const other = isRequester ? f.recipient : f.requester;
      const nickname = f.nicknameFor(req.userId);
      return {
        _id: other._id,
        username: other.username,
        avatar: other.avatar,
        lastSeen: other.lastSeen,
        verified: other.verified,
        nickname: nickname || '',
      };
    });

    res.json(friends);
  } catch (err) {
    res.status(500).json({ message: 'Could not load friends' });
  }
});

// PATCH /api/friends/:friendUserId/nickname { nickname } -> your own private
// name for this friend, like saving a phone contact. Doesn't touch their
// actual username or notify them in any way.
router.patch('/:friendUserId/nickname', requireAuth, async (req, res) => {
  try {
    const { friendUserId } = req.params;
    const { nickname } = req.body;
    if (!mongoose.Types.ObjectId.isValid(friendUserId)) {
      return res.status(400).json({ message: 'Invalid user id' });
    }

    const relation = await Friendship.findBetween(req.userId, friendUserId);
    if (!relation || relation.status !== 'accepted') {
      return res.status(404).json({ message: 'You are not friends with this user' });
    }

    const trimmed = (nickname || '').trim().slice(0, 30);
    const isRequester = String(relation.requester) === String(req.userId);
    if (isRequester) relation.requesterNickname = trimmed;
    else relation.recipientNickname = trimmed;
    await relation.save();

    res.json({ nickname: trimmed });
  } catch (err) {
    res.status(500).json({ message: 'Could not update nickname' });
  }
});

export default router;
