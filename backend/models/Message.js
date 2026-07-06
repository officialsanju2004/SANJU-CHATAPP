import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // Sorted "userIdA_userIdB" pair -> lets us fetch a whole conversation with a
    // single indexed equality match instead of an $or across two directions.
    conversationId: { type: String, required: true, index: true },
    type: {
      type: String,
      enum: ['text', 'image', 'voice'],
      default: 'text',
    },
    content: { type: String, trim: true, maxlength: 2000, default: '' },
    mediaUrl: { type: String, default: '' }, // image or voice-note file URL
    duration: { type: Number, default: 0 }, // voice note length in seconds
  },
  { timestamps: true }
);

// Powers both "load latest 30" and "load 30 before message X" in one index scan
messageSchema.index({ conversationId: 1, createdAt: -1 });

messageSchema.statics.conversationIdFor = function (userA, userB) {
  return [String(userA), String(userB)].sort().join('_');
};

export default mongoose.model('Message', messageSchema);

