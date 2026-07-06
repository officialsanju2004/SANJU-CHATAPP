import mongoose from 'mongoose';

// One document per browser/device subscription. A user can have several
// (phone, laptop, multiple browsers) - we fan a push out to all of them and
// prune any that the push service reports as dead (410/404).
const pushSubscriptionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    endpoint: { type: String, required: true, unique: true },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true },
    },
  },
  { timestamps: true }
);

export default mongoose.model('PushSubscription', pushSubscriptionSchema);
