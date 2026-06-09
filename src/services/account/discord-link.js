import { query } from '../../config/database.js';

export async function getLinkByDiscordId(discordId) {
  const rows = await query(
    `SELECT discord_id AS discordId, account_id AS accountId, linked_at AS linkedAt
     FROM site_discord_links
     WHERE discord_id = ?
     LIMIT 1`,
    [discordId],
  );

  return rows[0] ?? null;
}

export async function getLinkByAccountId(accountId) {
  const rows = await query(
    `SELECT discord_id AS discordId, account_id AS accountId, linked_at AS linkedAt
     FROM site_discord_links
     WHERE account_id = ?
     LIMIT 1`,
    [accountId],
  );

  return rows[0] ?? null;
}

export async function createDiscordLink(discordId, accountId) {
  await query(
    `INSERT INTO site_discord_links (discord_id, account_id)
     VALUES (?, ?)`,
    [discordId, accountId],
  );
}
