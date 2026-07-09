import mongoose from 'mongoose';

const blockSchema = new mongoose.Schema(
  {
    blocker: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    blocked: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  },
  { timestamps: true }
);

blockSchema.index({ blocker: 1, blocked: 1 }, { unique: true });

// True if either person has blocked the other - messaging/calls are cut off
// in both directions once a block exists, not just one way.
blockSchema.statics.existsBetween = async function (userA, userB) {
  const block = await this.findOne({
    $or: [
      { blocker: userA, blocked: userB },
      { blocker: userB, blocked: userA },
    ],
  });
  return !!block;
};

export default mongoose.model('Block', blockSchema);
