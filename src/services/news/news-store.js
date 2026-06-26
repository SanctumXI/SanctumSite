import { query } from '../../config/database.js';

const MAX_TITLE = 200;
const MAX_BODY = 8000;

function mapRow(row) {
  return {
    id: Number(row.id),
    title: row.title,
    body: row.body,
    authorDiscordId: row.author_discord_id,
    authorName: row.author_name,
    publishedAt: row.published_at,
  };
}

export async function listNews(limit = 20) {
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 50);
  const rows = await query(
    `SELECT id, title, body, author_discord_id, author_name, published_at
     FROM site_news
     ORDER BY published_at DESC, id DESC
     LIMIT ?`,
    [safeLimit],
  );
  return rows.map(mapRow);
}

export async function getNewsItem(id) {
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId < 1) {
    return null;
  }

  const rows = await query(
    `SELECT id, title, body, author_discord_id, author_name, published_at
     FROM site_news
     WHERE id = ?
     LIMIT 1`,
    [numericId],
  );
  return rows[0] ? mapRow(rows[0]) : null;
}

export async function createNews({ title, body, authorDiscordId, authorName }) {
  const cleanTitle = String(title ?? '').trim().slice(0, MAX_TITLE);
  const cleanBody = String(body ?? '').trim().slice(0, MAX_BODY);

  if (!cleanTitle) {
    const error = new Error('Title is required');
    error.code = 'INVALID_NEWS';
    throw error;
  }
  if (!cleanBody) {
    const error = new Error('Body is required');
    error.code = 'INVALID_NEWS';
    throw error;
  }

  const result = await query(
    `INSERT INTO site_news (title, body, author_discord_id, author_name, published_at)
     VALUES (?, ?, ?, ?, UTC_TIMESTAMP())`,
    [cleanTitle, cleanBody, authorDiscordId, authorName ?? null],
  );

  return getNewsItem(Number(result.insertId));
}

export async function updateNews(id, { title, body }) {
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId < 1) {
    return null;
  }

  const cleanTitle = String(title ?? '').trim().slice(0, MAX_TITLE);
  const cleanBody = String(body ?? '').trim().slice(0, MAX_BODY);

  if (!cleanTitle) {
    const error = new Error('Title is required');
    error.code = 'INVALID_NEWS';
    throw error;
  }
  if (!cleanBody) {
    const error = new Error('Body is required');
    error.code = 'INVALID_NEWS';
    throw error;
  }

  const result = await query(
    `UPDATE site_news SET title = ?, body = ? WHERE id = ?`,
    [cleanTitle, cleanBody, numericId],
  );

  if (!result.affectedRows) {
    return null;
  }

  return getNewsItem(numericId);
}

export async function deleteNews(id) {
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId < 1) {
    return false;
  }

  const result = await query(`DELETE FROM site_news WHERE id = ?`, [numericId]);
  return Boolean(result.affectedRows);
}
