import mongoose from 'mongoose';

const memberSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['admin', 'member'], default: 'member' },
    joinedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const groupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    avatar: { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    members: [memberSchema],
    autoDeleteSeconds: { type: Number, default: 0 },
  },
  { timestamps: true }
);

groupSchema.methods.isMember = function (userId) {
  return this.members.some((m) => String(m.user) === String(userId));
};

groupSchema.methods.isAdmin = function (userId) {
  return this.members.some((m) => String(m.user) === String(userId) && m.role === 'admin');
};

export default mongoose.model('Group', groupSchema);
