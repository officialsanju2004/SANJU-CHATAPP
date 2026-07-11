import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 24,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    avatar: {
      type: String, // full Cloudinary URL, e.g. https://res.cloudinary.com/.../avatars/xxx.jpg
      default: '',
    },
    // Cloudinary's asset id for the current avatar, so we can delete the old
    // one from Cloudinary when the user uploads a new avatar.
    avatarPublicId: {
      type: String,
      default: '',
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },

    // ✅ Chat lock: one PIN locks every conversation in the app. Only the
    // bcrypt hash is ever stored, exactly like the account password.
    chatLock: {
      enabled: { type: Boolean, default: false },
      pinHash: { type: String, default: '' },
    },

    // ✅ Privacy: if true, nobody can add this user to a group directly -
    // group creation/add-member requests silently skip them.
    privacy: {
      blockGroupAdd: { type: Boolean, default: false },
    },

    // ✅ Verified badge (orange tick). Only the @sanju account is allowed to
    // grant/revoke this - enforced in routes/users.js, not here.
    verified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.comparePin = function (candidate) {
  if (!this.chatLock?.pinHash) return Promise.resolve(false);
  return bcrypt.compare(candidate, this.chatLock.pinHash);
};

userSchema.methods.toSafeObject = function () {
  return {
    id: this._id,
    username: this.username,
    avatar: this.avatar,
    chatLockEnabled: !!this.chatLock?.enabled,
    blockGroupAdd: !!this.privacy?.blockGroupAdd,
    verified: !!this.verified,
  };
};

export default mongoose.model('User', userSchema);
