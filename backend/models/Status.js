import mongoose from 'mongoose';

const viewSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    viewedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const statusSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ['image', 'video', 'text'], required: true },
    mediaUrl: { type: String, default: '' }, // for type: 'image' or 'video'
    caption: { type: String, trim: true, maxlength: 300, default: '' },
    bgColor: { type: String, default: '#f97316' }, // for type: 'text' (solid background colour)
    views: [viewSchema],
    // Statuses disappear after 24h, same as WhatsApp - MongoDB's TTL index
    // deletes the document automatically once expiresAt is in the past, no
    // cron job needed.
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000),
      index: { expires: 0 },
    },
  },
  { timestamps: true }
);

statusSchema.methods.hasViewed = function (userId) {
  return this.views.some((v) => String(v.user) === String(userId));
};

export default mongoose.model('Status', statusSchema);
