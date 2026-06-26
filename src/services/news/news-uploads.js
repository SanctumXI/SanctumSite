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

// Replace any embedded base64 image (data: URI) in an HTML body with an uploaded
// file URL. Runs server-side so images persist and the DB stays lean no matter
// how the client embedded them (paste, drag, or direct base64). Unsupported
// types are dropped to an empty src (the sanitizer then strips them).
const DATA_URI = /data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=\s]+?)(?=["')\s])/g;

export function externalizeDataImages(html) {
  return String(html ?? '').replace(DATA_URI, (_match, mime, b64) => {
    try {
      const buffer = Buffer.from(b64.replace(/\s/g, ''), 'base64');
      return saveNewsImage(buffer, mime.toLowerCase());
    } catch {
      return '';
    }
  });
}
