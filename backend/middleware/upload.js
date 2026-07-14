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

// ⚠️ FIX: resource_type: 'auto' used to let Cloudinary DECIDE the resource
// type per file. Cloudinary treats PDFs as an "image" resource - which means
// they go through Cloudinary's image pipeline and hit its megapixel/page-count
// limits on the free plan. A small text-based PDF picked on a laptop stays
// under those limits and uploads fine; a multi-page PDF produced by a phone's
// "scan to PDF" feature (much higher resolution, more pages) blows past them
// and the upload silently fails - this was the actual cause of
// "mobile se PDF nahi bhejta, laptop se ho jati hai".
//
// Fix: force every non-image/video/audio file (pdf, doc, xls, ppt, zip, csv,
// txt, json, rtf) through resource_type: 'raw' instead. Raw files are stored
// and served as plain bytes - no image processing, no limits, no corruption -
// regardless of which device produced them.
//
// We also set use_filename/unique_filename/filename_override so the stored
// Cloudinary public_id keeps the real name+extension instead of a random
// hash, which used to make raw files come back with no recognizable format.
function resourceTypeFor(mimetype) {
  if (mimetype.startsWith('image/')) return 'image';
  if (mimetype.startsWith('video/')) return 'video';
  if (mimetype.startsWith('audio/')) return 'video'; // Cloudinary buckets audio under "video"
  return 'raw'; // pdf, doc, docx, xls, xlsx, ppt, pptx, csv, txt, json, rtf, zip, etc.
}

const mediaStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder: 'sanju-chat/media',
    resource_type: resourceTypeFor(file.mimetype),
    use_filename: true,
    unique_filename: true,
    filename_override: file.originalname,
    access_mode: 'public',
  }),
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

// Chat media can be an image, a short video, an audio voice note, or a
// document (PDF, TXT, Word, Excel, PowerPoint, CSV, ZIP) sent as a plain file.
const DOCUMENT_MIME_TYPES = new Set([
  'application/pdf',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/csv',
  'application/zip',
  'application/json',
  'application/rtf',
]);

const DOCUMENT_EXTENSIONS = new Set([
  'pdf',
  'txt',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'ppt',
  'pptx',
  'csv',
  'zip',
  'json',
  'rtf',
]);

// Mobile browsers (especially Android's document/file-manager pickers) often
// report a generic or missing mimetype - e.g. "application/octet-stream" or
// even "" - for perfectly valid PDFs/DOCX/etc. Relying on mimetype alone
// silently rejected those uploads ("PDF nahi bhejta tha"). We now also
// accept the file if its extension is a known document type.
const chatMediaFilter = (req, file, cb) => {
  const isImage = file.mimetype.startsWith('image/');
  const isAudio = file.mimetype.startsWith('audio/');
  const isVideo = file.mimetype.startsWith('video/');
  const isKnownDocMime = DOCUMENT_MIME_TYPES.has(file.mimetype);
  const ext = (file.originalname || '').split('.').pop()?.toLowerCase();
  const isKnownDocExt = DOCUMENT_EXTENSIONS.has(ext);

  if (isImage || isAudio || isVideo || isKnownDocMime || isKnownDocExt) {
    return cb(null, true);
  }
  cb(new Error('Only image, video, audio, or document files are allowed'));
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
  // 75MB - covers short videos/voice notes AND multi-page PDFs scanned on a
  // phone, which run bigger than a typical laptop-picked PDF.
  limits: { fileSize: 75 * 1024 * 1024 },
  fileFilter: chatMediaFilter,
});

export const uploadStatus = multer({
  storage: statusStorage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB (covers short status videos)
  fileFilter: statusFilter,
});
