import { query } from '../../config/database.js';

const DEFAULT_PRIVACY = {
  showAvatar: true,
  showUsername: true,
};

function normalizeSettings(row) {
  if (!row) {
    return { ...DEFAULT_PRIVACY };
  }

  return {
    showAvatar: Boolean(row.showAvatar),
    showUsername: Boolean(row.showUsername),
  };
}

export async function getProfileSettings(discordId) {
  const rows = await query(
    `SELECT show_avatar AS showAvatar, show_username AS showUsername
     FROM site_profile_settings
     WHERE discord_id = ?
     LIMIT 1`,
    [discordId],
  );

  return rows[0] ? normalizeSettings(rows[0]) : null;
}

export async function ensureProfileSettings(discordId, initial = DEFAULT_PRIVACY) {
  await query(
    `INSERT INTO site_profile_settings (discord_id, show_avatar, show_username)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE discord_id = discord_id`,
    [
      discordId,
      initial.showAvatar ? 1 : 0,
      initial.showUsername ? 1 : 0,
    ],
  );
}

export async function updateProfileSettings(discordId, { showAvatar, showUsername }) {
  const current = (await getProfileSettings(discordId)) ?? DEFAULT_PRIVACY;

  const next = {
    showAvatar: typeof showAvatar === 'boolean' ? showAvatar : current.showAvatar,
    showUsername: typeof showUsername === 'boolean' ? showUsername : current.showUsername,
  };

  await query(
    `INSERT INTO site_profile_settings (discord_id, show_avatar, show_username)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE
       show_avatar = VALUES(show_avatar),
       show_username = VALUES(show_username)`,
    [discordId, next.showAvatar ? 1 : 0, next.showUsername ? 1 : 0],
  );

  return next;
}
