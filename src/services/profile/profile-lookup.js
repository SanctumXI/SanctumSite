import { query } from '../../config/database.js';

export function isDiscordId(value) {
  return typeof value === 'string' && /^\d{17,20}$/.test(value);
}

export async function resolveDiscordIdByCharacterName(characterName) {
  const trimmed = characterName?.trim();
  if (!trimmed) {
    const error = new Error('Character name is required');
    error.code = 'INVALID_CHARACTER_NAME';
    throw error;
  }

  const rows = await query(
    `SELECT l.discord_id AS discordId, c.charname AS characterName
     FROM chars c
     INNER JOIN site_discord_links l ON l.account_id = c.accid
     WHERE c.charname = ?
     LIMIT 2`,
    [trimmed],
  );

  if (!rows.length) {
    const error = new Error('No linked profile was found for that character name');
    error.code = 'PROFILE_NOT_FOUND';
    throw error;
  }

  if (rows.length > 1) {
    const error = new Error('Multiple linked profiles match that character name');
    error.code = 'CHARACTER_AMBIGUOUS';
    throw error;
  }

  return {
    discordId: rows[0].discordId,
    characterName: rows[0].characterName,
  };
}
