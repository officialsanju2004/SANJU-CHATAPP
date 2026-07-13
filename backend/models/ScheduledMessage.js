import mongoose from 'mongoose';

const scheduledMessageSchema = new mongoose.Schema(
  {
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', default: null },
    type: { type: String, enum: ['text', 'image', 'video'], default: 'text' },
    content: { type: String, trim: true, maxlength: 2000, default: '' },
    mediaUrl: { type: String, default: '' },
    scheduledFor: { type: Date, required: true, index: true },
    sent: { type: Boolean, default: false },
    cancelled: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model('ScheduledMessage', scheduledMessageSchema);
