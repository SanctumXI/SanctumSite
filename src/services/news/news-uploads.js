import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Base dir served statically at /uploads; news images live in its news/ subdir
// and resolve to /uploads/news/<file>.
export const uploadsDir = path.join(__dirname, '..', '..', '..', 'data', 'uploads');
const newsImagesDir = path.join(uploadsDir, 'news');

fs.mkdirSync(newsImagesDir, { recursive: true });

// Only these image types are accepted; the extension is derived from the
// validated MIME, never from client-supplied filenames.
const MIME_EXT = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
};

export function saveNewsImage(buffer, mime) {
  const ext = MIME_EXT[mime];
  if (!ext) {
    const error = new Error('Unsupported image type (use PNG, JPEG, GIF, or WebP)');
    error.code = 'INVALID_IMAGE';
    throw error;
  }
  if (!buffer || !buffer.length) {
    const error = new Error('Empty image upload');
    error.code = 'INVALID_IMAGE';
    throw error;
  }

  const name = `${crypto.randomUUID()}.${ext}`;
  fs.writeFileSync(path.join(newsImagesDir, name), buffer);
  return `/uploads/news/${name}`;
}
