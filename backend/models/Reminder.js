import mongoose from 'mongoose';

const reminderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    message: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', required: true },
    note: { type: String, trim: true, maxlength: 200, default: '' },
    remindAt: { type: Date, required: true, index: true },
    sent: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model('Reminder', reminderSchema);
