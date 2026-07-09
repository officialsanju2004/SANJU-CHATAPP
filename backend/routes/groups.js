import { Router } from 'express';
import mongoose from 'mongoose';
import Group from '../models/Group.js';
import User from '../models/User.js';
import Message from '../models/Message.js';
import { requireAuth } from '../middleware/auth.js';
import { emitToUser } from '../socket/index.js';

const router = Router();

function summarize(group) {
  return {
    _id: group._id,
    name: group.name,
    avatar: group.avatar,
    createdBy: group.createdBy,
    members: group.members,
  };
}

// POST /api/groups { name, memberIds: [] } -> create a group (I'm auto-added as admin)
router.post('/', requireAuth, async (req, res) => {
  try {
    const { name, memberIds = [] } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: 'Group name is required' });

    const uniqueIds = [...new Set(memberIds.filter((id) => id !== req.userId))];
    const users = await User.find({ _id: { $in: uniqueIds } }).select('_id privacy username');

    const skipped = [];
    const allowedIds = [];
    for (const u of users) {
      if (u.privacy?.blockGroupAdd) skipped.push(u.username);
      else allowedIds.push(u._id);
    }

    const group = await Group.create({
      name: name.trim(),
      createdBy: req.userId,
      members: [
        { user: req.userId, role: 'admin' },
        ...allowedIds.map((id) => ({ user: id, role: 'member' })),
      ],
    });

    allowedIds.forEach((id) =>
      emitToUser(req.app.locals.io, id, 'added_to_group', { group: summarize(group) })
    );

    res.status(201).json({ group: summarize(group), skipped });
  } catch (err) {
    res.status(500).json({ message: 'Could not create group' });
  }
});

// GET /api/groups -> groups I'm a member of, with a chat-list preview
router.get('/', requireAuth, async (req, res) => {
  try {
    const groups = await Group.find({ 'members.user': req.userId }).populate(
      'members.user',
      'username avatar'
    );

    const withPreviews = await Promise.all(
      groups.map(async (group) => {
        const conversationId = Message.conversationIdForGroup(group._id);
        const [lastMessage, unreadCount] = await Promise.all([
          Message.findOne({ conversationId }).sort({ createdAt: -1 }).populate('sender', 'username').lean(),
          Message.countDocuments({
            conversationId,
            sender: { $ne: req.userId },
            'seenBy.user': { $ne: req.userId },
          }),
        ]);
        const maskedLast =
          lastMessage?.deletedForEveryone
            ? { ...lastMessage, content: '', mediaUrl: '', reactions: [] }
            : lastMessage;
        return { ...summarize(group), lastMessage: maskedLast, unreadCount };
      })
    );

    res.json(withPreviews);
  } catch (err) {
    res.status(500).json({ message: 'Could not load groups' });
  }
});

// GET /api/groups/:id
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id).populate('members.user', 'username avatar');
    if (!group || !group.isMember(req.userId)) {
      return res.status(404).json({ message: 'Group not found' });
    }
    res.json(summarize(group));
  } catch (err) {
    res.status(500).json({ message: 'Could not load group' });
  }
});

// POST /api/groups/:id/members { userId } -> add someone (admin only)
router.post('/:id/members', requireAuth, async (req, res) => {
  try {
    const { userId } = req.body;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user id' });
    }

    const group = await Group.findById(req.params.id);
    if (!group || !group.isMember(req.userId)) return res.status(404).json({ message: 'Group not found' });
    if (!group.isAdmin(req.userId)) return res.status(403).json({ message: 'Only admins can add members' });
    if (group.isMember(userId)) return res.status(400).json({ message: 'Already a member' });

    const target = await User.findById(userId).select('privacy username');
    if (target?.privacy?.blockGroupAdd) {
      return res
        .status(403)
        .json({ message: `${target.username} doesn't allow being added to groups` });
    }

    group.members.push({ user: userId, role: 'member' });
    await group.save();

    emitToUser(req.app.locals.io, userId, 'added_to_group', { group: summarize(group) });
    res.json(summarize(group));
  } catch (err) {
    res.status(500).json({ message: 'Could not add member' });
  }
});

// DELETE /api/groups/:id/members/:userId -> remove someone (admin only, or leave-yourself)
router.delete('/:id/members/:userId', requireAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const group = await Group.findById(req.params.id);
    if (!group || !group.isMember(req.userId)) return res.status(404).json({ message: 'Group not found' });

    const isSelf = userId === req.userId;
    if (!isSelf && !group.isAdmin(req.userId)) {
      return res.status(403).json({ message: 'Only admins can remove members' });
    }

    group.members = group.members.filter((m) => String(m.user) !== userId);
    if (group.members.length === 0) {
      await group.deleteOne();
      return res.json({ deleted: true });
    }
    // If we just removed the last admin, promote the earliest remaining member
    if (!group.members.some((m) => m.role === 'admin')) {
      group.members[0].role = 'admin';
    }
    await group.save();

    emitToUser(req.app.locals.io, userId, 'removed_from_group', { groupId: group._id });
    res.json(summarize(group));
  } catch (err) {
    res.status(500).json({ message: 'Could not remove member' });
  }
});

// PATCH /api/groups/:id { name } -> rename (admin only)
router.patch('/:id', requireAuth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group || !group.isMember(req.userId)) return res.status(404).json({ message: 'Group not found' });
    if (!group.isAdmin(req.userId)) return res.status(403).json({ message: 'Only admins can rename the group' });

    if (req.body.name?.trim()) group.name = req.body.name.trim();
    await group.save();
    res.json(summarize(group));
  } catch (err) {
    res.status(500).json({ message: 'Could not update group' });
  }
});

export default router;
