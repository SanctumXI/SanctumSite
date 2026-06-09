import { query } from '../../config/database.js';
import { getJwtConfig } from '../../config/jwt.js';
import { createRefreshToken, hashRefreshToken } from './jwt-tokens.js';

export async function storeRefreshToken(discordId, token) {
  const tokenHash = hashRefreshToken(token);
  const { refreshTtlSec } = getJwtConfig();
  const expiresAt = new Date(Date.now() + refreshTtlSec * 1000);

  await query(
    `INSERT INTO site_launcher_refresh_tokens (discord_id, token_hash, expires_at)
     VALUES (?, ?, ?)`,
    [discordId, tokenHash, expiresAt],
  );

  return { expiresAt };
}

export async function consumeRefreshToken(token) {
  const tokenHash = hashRefreshToken(token);
  const rows = await query(
    `SELECT id, discord_id AS discordId
     FROM site_launcher_refresh_tokens
     WHERE token_hash = ?
       AND revoked_at IS NULL
       AND expires_at > UTC_TIMESTAMP()
     LIMIT 1`,
    [tokenHash],
  );

  if (!rows.length) {
    return null;
  }

  await query(
    'UPDATE site_launcher_refresh_tokens SET revoked_at = UTC_TIMESTAMP() WHERE id = ?',
    [rows[0].id],
  );

  return { discordId: rows[0].discordId };
}

export function issueRefreshToken() {
  return createRefreshToken();
}
