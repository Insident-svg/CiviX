import {
  UploadApiOptions,
  UploadApiResponse,
} from 'cloudinary';

import cloudinary from '../config/cloudinary.js';

export function uploadBuffer(
  buffer: Buffer,
  options: UploadApiOptions = {},
): Promise<UploadApiResponse> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'auto',
        ...options,
      },
      (error, result) => {
        if (error) {
          return reject(error);
        }

        if (!result) {
          return reject(
            new Error('Cloudinary upload failed'),
          );
        }

        resolve(result);
      },
    );

    stream.end(buffer);
  });
}