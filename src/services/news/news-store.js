import db from '../../config/news-db.js';
import { htmlToText, sanitizeNewsHtml } from './sanitize-news.js';
import { externalizeDataImages } from './news-uploads.js';

const MAX_TITLE = 200;
const MAX_BODY = 500000; // images are URLs now (uploaded), so bodies stay small

function mapRow(row) {
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    authorDiscordId: row.author_discord_id,
    authorName: row.author_name,
    publishedAt: row.published_at,
    updatedAt: row.updated_at,
  };
}

function validate(title, rawBody) {
  const cleanTitle = String(title ?? '').trim().slice(0, MAX_TITLE);
  // Convert any embedded base64 images to uploaded file URLs before sanitizing,
  // so the stored body holds small URLs instead of megabytes of base64.
  const withUrls = externalizeDataImages(rawBody);
  const cleanBody = sanitizeNewsHtml(withUrls).slice(0, MAX_BODY);

  if (!cleanTitle) {
    const error = new Error('Title is required');
    error.code = 'INVALID_NEWS';
    throw error;
  }
  // Reject bodies that are visually empty after sanitization (e.g. "<p><br></p>"),
  // but an image-only post still counts as content.
  if (!htmlToText(cleanBody) && !/<img\b/i.test(cleanBody)) {
    const error = new Error('Body is required');
    error.code = 'INVALID_NEWS';
    throw error;
  }

  return { cleanTitle, cleanBody };
}

export function listNews(limit = 20) {
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 50);
  const rows = db
    .prepare(
      `SELECT id, title, body, author_discord_id, author_name, published_at, updated_at
       FROM news
       ORDER BY published_at DESC, id DESC
       LIMIT ?`,
    )
    .all(safeLimit);
  return rows.map(mapRow);
}

export function getNewsItem(id) {
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId < 1) {
    return null;
  }
  const row = db
    .prepare(
      `SELECT id, title, body, author_discord_id, author_name, published_at, updated_at
       FROM news WHERE id = ?`,
    )
    .get(numericId);
  return mapRow(row);
}

export function createNews({ title, body, authorDiscordId, authorName }) {
  const { cleanTitle, cleanBody } = validate(title, body);
  const now = new Date().toISOString();

  const result = db
    .prepare(
      `INSERT INTO news (title, body, author_discord_id, author_name, published_at)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run(cleanTitle, cleanBody, authorDiscordId, authorName ?? null, now);

  return getNewsItem(Number(result.lastInsertRowid));
}

export function updateNews(id, { title, body }) {
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId < 1) {
    return null;
  }

  const { cleanTitle, cleanBody } = validate(title, body);
  const now = new Date().toISOString();

  const result = db
    .prepare(`UPDATE news SET title = ?, body = ?, updated_at = ? WHERE id = ?`)
    .run(cleanTitle, cleanBody, now, numericId);

  if (!result.changes) {
    return null;
  }
  return getNewsItem(numericId);
}

export function deleteNews(id) {
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId < 1) {
    return false;
  }
  const result = db.prepare(`DELETE FROM news WHERE id = ?`).run(numericId);
  return Boolean(result.changes);
}
