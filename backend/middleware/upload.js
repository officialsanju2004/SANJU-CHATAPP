import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

// ⚠️ FIX: avatars/media used to be saved with multer.diskStorage() straight
// onto the server's local filesystem (uploads/avatars, uploads/media).
// That works fine on your own laptop, but almost every free host (Render,
// Railway, Vercel, etc.) gives you an EPHEMERAL filesystem: the disk gets
// wiped every time the server restarts, redeploys, or spins back up after
// being idle. That's exactly why an uploaded profile picture showed up for
// a bit and then "disappeared" - the file it pointed to no longer existed
// once the container recycled.
//
// Cloudinary (or S3/Supabase Storage - same idea) stores the file on a
// separate, persistent service, so the URL keeps working no matter what
// happens to your server's disk.

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const cloudinaryConfigured = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
);

if (!cloudinaryConfigured) {
  console.warn(
    'Cloudinary is not configured (missing CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / ' +
      'CLOUDINARY_API_SECRET). Avatar/media uploads will fail until these are set in backend/.env. ' +
      'Get free credentials at https://cloudinary.com'
  );
}

const avatarStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'sanju-chat/avatars',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
    // Keeps avatars a sane size regardless of what the user uploads
    transformation: [{ width: 512, height: 512, crop: 'limit' }],
  },
});

const mediaStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'sanju-chat/media',
    // Chat media can be an image or a voice note - Cloudinary's "auto"
    // resource_type handles both without needing two separate storages.
    resource_type: 'auto',
  },
});

const statusStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'sanju-chat/status',
    resource_type: 'auto', // image or short video
  },
});

const imageFilter = (req, file, cb) => {
  if (!file.mimetype.startsWith('image/')) {
    return cb(new Error('Only image files are allowed'));
  }
  cb(null, true);
};

// Chat media can be an image, a short video, or an audio voice note
const chatMediaFilter = (req, file, cb) => {
  if (
    !file.mimetype.startsWith('image/') &&
    !file.mimetype.startsWith('audio/') &&
    !file.mimetype.startsWith('video/')
  ) {
    return cb(new Error('Only image, video, or audio files are allowed'));
  }
  cb(null, true);
};

// Status can be an image or a short video
const statusFilter = (req, file, cb) => {
  if (!file.mimetype.startsWith('image/') && !file.mimetype.startsWith('video/')) {
    return cb(new Error('Only image or video files are allowed'));
  }
  cb(null, true);
};

export const uploadAvatar = multer({
  storage: avatarStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: imageFilter,
});

export const uploadChatMedia = multer({
  storage: mediaStorage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB (covers short videos + voice notes)
  fileFilter: chatMediaFilter,
});

export const uploadStatus = multer({
  storage: statusStorage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB (covers short status videos)
  fileFilter: statusFilter,
});
