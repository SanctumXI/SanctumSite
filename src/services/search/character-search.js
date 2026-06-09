import { query } from '../../config/database.js';

export async function suggestLinkedCharacters(prefix, limit = 8) {
  const trimmed = prefix?.trim();
  if (!trimmed || trimmed.length < 2) {
    return [];
  }

  const rows = await query(
    `SELECT c.charname AS characterName, l.discord_id AS discordId
     FROM chars c
     INNER JOIN site_discord_links l ON l.account_id = c.accid
     WHERE c.charname LIKE ?
     ORDER BY c.charname ASC
     LIMIT ?`,
    [`${trimmed}%`, limit],
  );

  return rows.map((row) => ({
    type: 'character',
    characterName: row.characterName,
    discordId: row.discordId,
    label: row.characterName,
  }));
}
