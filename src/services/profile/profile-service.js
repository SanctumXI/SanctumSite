import { getGameData } from './game-data.js';
import { getStoredProfile } from './profile-store.js';

function buildProfileResponse(stored, game, viewerDiscordId) {
  const isOwner = viewerDiscordId === stored.discordId;

  const response = {
    discordId: stored.discordId,
    isOwner,
    game,
  };

  if (isOwner) {
    response.discord = {
      avatarUrl: stored.avatarUrl,
      username: stored.username,
      globalName: stored.globalName,
    };
    response.privacy = {
      showAvatar: stored.showAvatar,
      showUsername: stored.showUsername,
    };
    response.view = 'own';
    return response;
  }

  response.discord = {
    avatarUrl: stored.showAvatar ? stored.avatarUrl : null,
    username: stored.showUsername ? stored.username : null,
    globalName: stored.globalName,
  };
  response.view = 'public';

  return response;
}

export async function getProfileForViewer(discordId, viewerDiscordId = null) {
  const stored = await getStoredProfile(discordId);
  if (!stored) {
    return null;
  }

  const game = await getGameData(discordId);
  return buildProfileResponse(stored, game, viewerDiscordId);
}
