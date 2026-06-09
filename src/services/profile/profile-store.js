import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDiscordUser, upsertDiscordUser } from '../account/discord-user.js';
import {
  ensureProfileSettings,
  getProfileSettings,
  updateProfileSettings,
} from './profile-settings.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROFILE_DIR = path.join(__dirname, '..', '..', '..', 'data', 'profiles');

const DEFAULT_PRIVACY = {
  showAvatar: true,
  showUsername: true,
};

function profilePath(discordId) {
  return path.join(PROFILE_DIR, `${discordId}.json`);
}

async function readLegacyFilePrivacy(discordId) {
  try {
    const raw = await fs.readFile(profilePath(discordId), 'utf8');
    const parsed = JSON.parse(raw);
    return {
      showAvatar: parsed.showAvatar ?? DEFAULT_PRIVACY.showAvatar,
      showUsername: parsed.showUsername ?? DEFAULT_PRIVACY.showUsername,
    };
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

export async function getStoredProfile(discordId) {
  const user = await getDiscordUser(discordId);
  if (!user) {
    return null;
  }

  let settings = await getProfileSettings(discordId);
  if (!settings) {
    const legacy = await readLegacyFilePrivacy(discordId);
    await ensureProfileSettings(discordId, legacy ?? DEFAULT_PRIVACY);
    settings = (await getProfileSettings(discordId)) ?? DEFAULT_PRIVACY;
  }

  return {
    discordId: user.discordId,
    username: user.username,
    globalName: user.globalName,
    avatarUrl: user.avatarUrl,
    showAvatar: settings.showAvatar,
    showUsername: settings.showUsername,
  };
}

export async function upsertFromDiscord(sessionUser) {
  await upsertDiscordUser(sessionUser);

  const existingSettings = await getProfileSettings(sessionUser.id);
  if (!existingSettings) {
    const legacy = await readLegacyFilePrivacy(sessionUser.id);
    await ensureProfileSettings(sessionUser.id, legacy ?? DEFAULT_PRIVACY);
  }

  return getStoredProfile(sessionUser.id);
}

export async function updatePrivacy(discordId, { showAvatar, showUsername }) {
  const user = await getDiscordUser(discordId);
  if (!user) {
    return null;
  }

  const settings = await updateProfileSettings(discordId, { showAvatar, showUsername });

  return {
    discordId: user.discordId,
    username: user.username,
    globalName: user.globalName,
    avatarUrl: user.avatarUrl,
    showAvatar: settings.showAvatar,
    showUsername: settings.showUsername,
  };
}
