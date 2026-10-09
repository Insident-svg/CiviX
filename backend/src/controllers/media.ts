import { Response } from 'express';

import { uploadBuffer } from '../services/cloudinary.js';
import { ok } from '../utils/http.js';
import { AuthRequest } from '../types/index.js';

export async function uploadMedia(
  req: AuthRequest,
  res: Response,
) {
  const files = (req.files ?? []) as Express.Multer.File[];

  const items = await Promise.all(
    files.map(async (file) => {
      const type = file.mimetype.startsWith('image/')
        ? 'image'
        : file.mimetype.startsWith('video/')
          ? 'video'
          : 'voice';

      const result = await uploadBuffer(
        file.buffer,
        {
          folder: 'synapse/media',
          resource_type: 'auto',
        },
      );

      return {
        type,
        url: result.secure_url,
        mimeType: file.mimetype,
        size: file.size,
        publicId: result.public_id,
      };
    }),
  );

  return ok(res, { items }, 201);
}