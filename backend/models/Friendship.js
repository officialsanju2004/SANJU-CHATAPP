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

export default mongoose.model('Friendship', friendshipSchema);
