import { query } from '../../config/database.js';

export async function upsertDiscordUser(sessionUser) {
  await query(
    `INSERT INTO site_discord_users (discord_id, username, global_name, avatar_url, last_login_at)
     VALUES (?, ?, ?, ?, UTC_TIMESTAMP())
     ON DUPLICATE KEY UPDATE
       username = VALUES(username),
       global_name = VALUES(global_name),
       avatar_url = VALUES(avatar_url),
       last_login_at = UTC_TIMESTAMP()`,
    [
      sessionUser.id,
      sessionUser.username,
      sessionUser.globalName,
      sessionUser.avatarUrl,
    ],
  );
}

export async function getDiscordUser(discordId) {
  const rows = await query(
    `SELECT discord_id AS discordId, username, global_name AS globalName, avatar_url AS avatarUrl
     FROM site_discord_users
     WHERE discord_id = ?
     LIMIT 1`,
    [discordId],
  );

  return rows[0] ?? null;
}
