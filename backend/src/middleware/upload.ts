import multer from 'multer';

import { env } from '../config/env.js';

const allowedMimeTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',

  'video/mp4',
  'video/quicktime',
  'video/webm',

  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  'audio/mp4',
  'audio/webm',
]);

const storage = multer.memoryStorage();

export const upload = multer({
  storage,

  limits: {
    fileSize:
      env.MAX_FILE_SIZE_MB * 1024 * 1024,

    files: 10,
  },

  fileFilter: (
    _req,
    file,
    callback,
  ) => {
    if (
      !allowedMimeTypes.has(
        file.mimetype,
      )
    ) {
      return callback(
        new Error(
          `Unsupported file type: ${file.mimetype}`,
        ),
      );
    }

    callback(null, true);
  },
});