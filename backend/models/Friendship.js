import mongoose from 'mongoose';

const friendshipSchema = new mongoose.Schema(
  {
    requester: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending',
    },

    // ✅ Contact nicknames: what EACH side privately calls the other, like
    // saving a phone contact under your own name for them. Never visible to
    // or changes the other person's real username.
    requesterNickname: { type: String, trim: true, maxlength: 30, default: '' }, // set BY requester, FOR recipient
    recipientNickname: { type: String, trim: true, maxlength: 30, default: '' }, // set BY recipient, FOR requester
    // ✅ Auto-delete messages: 0 = off, otherwise seconds after which a
    // message in this conversation is auto-removed for both sides. Either
    // person can set it - like WhatsApp's disappearing messages, it applies
    // going forward to the whole conversation once set.
    autoDeleteSeconds: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// A pair of users should only ever have one active relationship document
friendshipSchema.index({ requester: 1, recipient: 1 }, { unique: true });

// Helper: find any existing relationship between two users, in either direction
friendshipSchema.statics.findBetween = function (userA, userB) {
  return this.findOne({
    $or: [
      { requester: userA, recipient: userB },
      { requester: userB, recipient: userA },
    ],
  });
};

// The nickname `viewerId` has set for the other person in this friendship, if any
friendshipSchema.methods.nicknameFor = function (viewerId) {
  const isRequester = String(this.requester) === String(viewerId);
  return isRequester ? this.requesterNickname : this.recipientNickname;
};

export default mongoose.model('Friendship', friendshipSchema);
