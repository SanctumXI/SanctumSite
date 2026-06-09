import { getPublicGameDataForDiscord } from '../account/game-account.js';

const PLACEHOLDER = '—';

function placeholderGameData() {
  return {
    characterName: PLACEHOLDER,
    job: PLACEHOLDER,
    level: PLACEHOLDER,
    zone: PLACEHOLDER,
    nation: PLACEHOLDER,
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
      job: character.job ?? PLACEHOLDER,
      level: character.level ?? PLACEHOLDER,
      zone: character.zone ?? PLACEHOLDER,
      nation: character.nation ?? PLACEHOLDER,
    };
  } catch (error) {
    console.error('Game data lookup failed:', error.message);
    return placeholderGameData();
  }
}