import { query } from '../../config/database.js';
import { createDiscordLink, getLinkByAccountId, getLinkByDiscordId } from './discord-link.js';
import { JOB_EXP_COLUMNS, pickRandomJobWithExp } from './job-exp.js';

const CHALLENGE_TTL_MS = 10 * 60 * 1000;

export function buildLinkChallenge(charRow, jobChallenge) {
  return {
    discordId: null,
    charid: charRow.charid,
    accountId: charRow.accid,
    characterName: charRow.charname,
    jobColumn: jobChallenge.column,
    jobLabel: jobChallenge.label,
    expectedExperience: jobChallenge.experience,
    createdAt: Date.now(),
    expiresAt: Date.now() + CHALLENGE_TTL_MS,
  };
}

export function attachChallengeDiscordId(challenge, discordId) {
  return { ...challenge, discordId };
}

export function isChallengeValid(challenge, discordId) {
  if (!challenge) {
    return false;
  }

  if (challenge.discordId !== discordId) {
    return false;
  }

  return Date.now() < challenge.expiresAt;
}

export async function assertDiscordAvailable(discordId) {
  const existing = await getLinkByDiscordId(discordId);
  if (existing) {
    const error = new Error('This Discord account is already linked to a game account');
    error.code = 'DISCORD_ALREADY_LINKED';
    throw error;
  }
}

async function getCharactersByName(characterName) {
  return query(
    `SELECT charid, accid, charname
     FROM chars
     WHERE charname = ?
     LIMIT 2`,
    [characterName],
  );
}

async function getCharacterExperience(charid) {
  const columns = JOB_EXP_COLUMNS.join(', ');
  const rows = await query(
    `SELECT charid, ${columns}
     FROM char_exp
     WHERE charid = ?
     LIMIT 1`,
    [charid],
  );

  return rows[0] ?? null;
}

export async function startLinkChallenge(characterName) {
  const trimmed = characterName?.trim();
  if (!trimmed) {
    const error = new Error('Character name is required');
    error.code = 'INVALID_CHARACTER_NAME';
    throw error;
  }

  const matches = await getCharactersByName(trimmed);
  if (!matches.length) {
    const error = new Error('No character was found with that name');
    error.code = 'CHARACTER_NOT_FOUND';
    throw error;
  }

  if (matches.length > 1) {
    const error = new Error('Multiple characters share that name — contact staff to link manually');
    error.code = 'CHARACTER_AMBIGUOUS';
    throw error;
  }

  const charRow = matches[0];
  const accountLink = await getLinkByAccountId(charRow.accid);
  if (accountLink) {
    const error = new Error('That character is already linked to another Discord account');
    error.code = 'ACCOUNT_ALREADY_LINKED';
    throw error;
  }

  const expRow = await getCharacterExperience(charRow.charid);
  if (!expRow) {
    const error = new Error('No job experience data was found for that character');
    error.code = 'EXPERIENCE_NOT_FOUND';
    throw error;
  }

  const jobChallenge = pickRandomJobWithExp(expRow);
  if (!jobChallenge) {
    const error = new Error('That character has no job experience above 0 to verify');
    error.code = 'NO_ELIGIBLE_JOB';
    throw error;
  }

  return {
    challenge: buildLinkChallenge(charRow, jobChallenge),
    prompt: {
      characterName: charRow.charname,
      job: jobChallenge.label,
    },
  };
}

export async function verifyLinkChallenge(challenge, experienceValue, discordId) {
  if (!isChallengeValid(challenge, discordId)) {
    const error = new Error('Link verification expired — start again');
    error.code = 'CHALLENGE_EXPIRED';
    throw error;
  }

  const normalized = String(experienceValue).trim().replace(/,/g, '');
  const submitted = Number(normalized);
  if (!Number.isFinite(submitted) || submitted < 0 || !Number.isInteger(submitted)) {
    const error = new Error('Experience must be a whole number');
    error.code = 'INVALID_EXPERIENCE';
    throw error;
  }

  if (submitted !== challenge.expectedExperience) {
    const error = new Error('Experience value does not match — try again');
    error.code = 'EXPERIENCE_MISMATCH';
    throw error;
  }

  await createDiscordLink(discordId, challenge.accountId);

  return {
    linked: true,
    accountId: challenge.accountId,
    characterName: challenge.characterName,
  };
}
