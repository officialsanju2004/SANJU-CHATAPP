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

const pollOptionSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, trim: true, maxlength: 100 },
    votes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { _id: false }
);

const pollSchema = new mongoose.Schema(
  {
    question: { type: String, required: true, trim: true, maxlength: 200 },
    options: [pollOptionSchema],
    allowMultiple: { type: Boolean, default: false },
    closedAt: { type: Date, default: null },
  },
  { _id: false }
);

const locationSchema = new mongoose.Schema(
  {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    live: { type: Boolean, default: false },
    expiresAt: { type: Date, default: null }, // set when live: true
  },
  { _id: false }
);

const statusReplySchema = new mongoose.Schema(
  {
    statusId: { type: mongoose.Schema.Types.ObjectId, ref: 'Status', required: true },
    type: { type: String, enum: ['image', 'video', 'text'] },
    mediaUrl: { type: String, default: '' },
    caption: { type: String, default: '' },
    bgColor: { type: String, default: '' },
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
      enum: ['text', 'image', 'video', 'voice', 'poll', 'location'],
      default: 'text',
    },
    content: { type: String, trim: true, maxlength: 2000, default: '' },
    mediaUrl: { type: String, default: '' },
    duration: { type: Number, default: 0 },
    poll: { type: pollSchema, default: null },
    location: { type: locationSchema, default: null },

    // ✅ Star/favourite - per-user, like WhatsApp (each person stars their
    // own copy of the conversation, not shared with the other side).
    starredBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    // ✅ Read receipts - 1:1 uses the simple boolean; group messages use
    // seenBy (one entry per member who's viewed it) instead.
    seen: { type: Boolean, default: false },
    seenAt: { type: Date, default: null },
    seenBy: [seenBySchema],

    replyTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null },

    // ✅ A text reply sent from someone's status - snapshot (not a live ref)
    // since the original Status auto-expires after 24h and we still want the
    // quote to render correctly after that.
    statusReplyTo: { type: statusReplySchema, default: null },

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
messageSchema.index({ content: 'text' });

messageSchema.statics.conversationIdFor = function (userA, userB) {
  return [String(userA), String(userB)].sort().join('_');
};

messageSchema.statics.conversationIdForGroup = function (groupId) {
  return `group_${groupId}`;
};

export default mongoose.model('Message', messageSchema);
