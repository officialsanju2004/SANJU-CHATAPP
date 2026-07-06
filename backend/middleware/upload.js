import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

const AVATAR_DIR = path.join(process.cwd(), 'uploads', 'avatars');
const MEDIA_DIR = path.join(process.cwd(), 'uploads', 'media');

for (const dir of [AVATAR_DIR, MEDIA_DIR]) {
  fs.mkdirSync(dir, { recursive: true });
}

function filenameFor(originalname) {
  const ext = path.extname(originalname) || '';
  return `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
}

const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, AVATAR_DIR),
  filename: (req, file, cb) => cb(null, filenameFor(file.originalname)),
});

const mediaStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, MEDIA_DIR),
  filename: (req, file, cb) => cb(null, filenameFor(file.originalname)),
});

const imageFilter = (req, file, cb) => {
  if (!file.mimetype.startsWith('image/')) {
    return cb(new Error('Only image files are allowed'));
  }
  cb(null, true);
};

// Chat media can be an image or an audio voice note
const chatMediaFilter = (req, file, cb) => {
  if (!file.mimetype.startsWith('image/') && !file.mimetype.startsWith('audio/')) {
    return cb(new Error('Only image or audio files are allowed'));
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
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB (covers voice notes)
  fileFilter: chatMediaFilter,
});
