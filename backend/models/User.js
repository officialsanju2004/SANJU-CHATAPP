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

      // Online status: hide the green/online indicator from everyone except
      // the people listed in onlineVisibleTo.
      hideOnlineStatus: { type: Boolean, default: false },
      onlineVisibleTo: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

      // Last seen: 'everyone' (default), 'nobody', or 'selected' (only the
      // people in lastSeenVisibleTo see the real timestamp - everyone else
      // just sees nothing).
      lastSeenVisibility: { type: String, enum: ['everyone', 'nobody', 'selected'], default: 'everyone' },
      lastSeenVisibleTo: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    },

    // ✅ Pinned chats: conversation keys like "dm-<userId>" or "group-<groupId>",
    // most-recently-pinned first so the UI can keep pin order stable.
    pinnedChats: [{ type: String }],

    // ✅ Theme preference (Blue/Green/Purple/AMOLED Black/default ember)
    theme: { type: String, enum: ['ember', 'blue', 'green', 'purple', 'amoled'], default: 'ember' },

    // ✅ Verified badge (orange tick). Only the @sanju account is allowed to
    // grant/revoke this - enforced in routes/users.js, not here.
    verified: { type: Boolean, default: false },

    // ✅ Marks the reserved "AI Assistant" pseudo-account - messaging it
    // skips the normal friendship requirement and triggers an AI reply.
    isBot: { type: Boolean, default: false },
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

// Is my online status visible to this particular viewer?
userSchema.methods.isOnlineVisibleTo = function (viewerId) {
  if (!this.privacy?.hideOnlineStatus) return true;
  return (this.privacy.onlineVisibleTo || []).some((id) => String(id) === String(viewerId));
};

// Is my last-seen timestamp visible to this particular viewer?
userSchema.methods.isLastSeenVisibleTo = function (viewerId) {
  const vis = this.privacy?.lastSeenVisibility || 'everyone';
  if (vis === 'everyone') return true;
  if (vis === 'nobody') return false;
  return (this.privacy.lastSeenVisibleTo || []).some((id) => String(id) === String(viewerId));
};

userSchema.methods.toSafeObject = function () {
  return {
    id: this._id,
    username: this.username,
    avatar: this.avatar,
    chatLockEnabled: !!this.chatLock?.enabled,
    blockGroupAdd: !!this.privacy?.blockGroupAdd,
    verified: !!this.verified,
    theme: this.theme || 'ember',
    pinnedChats: this.pinnedChats || [],
  };
};

export default mongoose.model('User', userSchema);
