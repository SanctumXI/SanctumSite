import { getPublicGameDataForDiscord } from '../account/game-account.js';
import { getLinkByDiscordId } from '../account/discord-link.js';

const PLACEHOLDER = '—';

function placeholderGameData() {
  return {
    characterName: PLACEHOLDER,
    jobLevel: PLACEHOLDER,
    zone: PLACEHOLDER,
    nation: PLACEHOLDER,
    jobs: [],
    missions: [],
    skills: [],
    currencies: [],
    crafting: [],
    linked: false,
  };
}

export async function getGameData(discordId) {
  try {
    const data = await getPublicGameDataForDiscord(discordId);
    if (!data.linked || !data.character) {
      return data.linked
        ? { ...placeholderGameData(), linked: true }
        : placeholderGameData();
    }

    const { character } = data;
    return {
      linked: true,
      characterName: character.characterName ?? character.charname ?? PLACEHOLDER,
      jobLevel: character.jobLevel ?? PLACEHOLDER,
      zone: character.zone ?? PLACEHOLDER,
      nation: character.nation ?? PLACEHOLDER,
      jobs: character.jobs ?? [],
      missions: character.missions ?? [],
      skills: character.skills ?? [],
      currencies: character.currencies ?? [],
      crafting: character.crafting ?? [],
    };
  } catch (error) {
    console.error('Game data lookup failed:', error.message);

    try {
      const link = await getLinkByDiscordId(discordId);
      if (link) {
        return { ...placeholderGameData(), linked: true };
      }
    } catch (linkError) {
      console.error('Link status lookup failed:', linkError.message);
    }

    return placeholderGameData();
  }
}