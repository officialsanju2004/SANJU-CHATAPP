import mongoose from 'mongoose';

const reactionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    emoji: { type: String, required: true },
  },
  { _id: false }
);

const seenBySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    seenAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const messageSchema = new mongoose.Schema(
  {
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    // 1:1 messages use `receiver`; group messages use `group` instead. Exactly
    // one of the two is set, enforced in the socket handler before save.
    receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', default: null },

    // 1:1: sorted "userIdA_userIdB" pair. Group: "group_<groupId>". Either way
    // this is what the { conversationId, createdAt } index scans over.
    conversationId: { type: String, required: true, index: true },

    type: {
      type: String,
      enum: ['text', 'image', 'voice'],
      default: 'text',
    },
    content: { type: String, trim: true, maxlength: 2000, default: '' },
    mediaUrl: { type: String, default: '' },
    duration: { type: Number, default: 0 },

    // ✅ Read receipts - 1:1 uses the simple boolean; group messages use
    // seenBy (one entry per member who's viewed it) instead.
    seen: { type: Boolean, default: false },
    seenAt: { type: Date, default: null },
    seenBy: [seenBySchema],

    replyTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null },
    deletedFor: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    viewOnce: { type: Boolean, default: false },
    viewOnceOpenedAt: { type: Date, default: null },

    reactions: [reactionSchema],

    // ✅ Edit message (text only)
    editedAt: { type: Date, default: null },

    // ✅ Unsend / "delete for everyone" - content/media are wiped once this
    // flips true; every client renders "This message was deleted" instead.
    deletedForEveryone: { type: Boolean, default: false },
  },
  { timestamps: true }
);

messageSchema.index({ conversationId: 1, createdAt: -1 });

messageSchema.statics.conversationIdFor = function (userA, userB) {
  return [String(userA), String(userB)].sort().join('_');
};

messageSchema.statics.conversationIdForGroup = function (groupId) {
  return `group_${groupId}`;
};

export default mongoose.model('Message', messageSchema);
