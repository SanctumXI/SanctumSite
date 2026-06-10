import { query } from '../../config/database.js';
import { assertNeverExpose } from '../../config/field-policy.js';
import { getLinkByDiscordId } from './discord-link.js';
import { getExpBaseByLevel } from './exp-base.js';
import { buildJobList, JOB_EXP_COLUMNS } from './job-exp.js';
import { buildProfileMissions } from './mission-display.js';
import { buildProfileSkills } from './skill-display.js';
import { buildProfileCurrencies, buildProfileCrafting, CHAR_POINTS_COLUMNS } from './currency-display.js';
import { formatJobLevel, jobName, nationName } from './job-names.js';
import { zoneName } from './zone-names.js';

async function getPrimaryCharacter(accountId) {
  const rows = await query(
    `SELECT c.charid, c.accid, c.charname, c.nation, c.pos_zone AS zoneId
     FROM chars c
     WHERE c.accid = ?
     ORDER BY c.lastupdate DESC
     LIMIT 1`,
    [accountId],
  );

  return rows[0] ?? null;
}

async function getCharacterStats(charId) {
  const rows = await query(
    `SELECT charid, hp, mp, mjob, sjob, mlvl, slvl
     FROM char_stats
     WHERE charid = ?
     LIMIT 1`,
    [charId],
  );

  return rows[0] ?? null;
}

async function getCharacterMissions(charId) {
  const rows = await query(
    `SELECT missions
     FROM chars
     WHERE charid = ?
     LIMIT 1`,
    [charId],
  );

  const blob = rows[0]?.missions;
  if (!blob) {
    return null;
  }

  return Buffer.isBuffer(blob) ? blob : Buffer.from(blob);
}

async function getCharacterJobs(charId) {
  const columns = JOB_EXP_COLUMNS.join(', ');
  const rows = await query(
    `SELECT charid, ${columns}
     FROM char_jobs
     WHERE charid = ?
     LIMIT 1`,
    [charId],
  );

  return rows[0] ?? null;
}

async function getCharacterPoints(charId) {
  const columns = CHAR_POINTS_COLUMNS.join(', ');
  const rows = await query(
    `SELECT ${columns}
     FROM char_points
     WHERE charid = ?
     LIMIT 1`,
    [charId],
  );

  return rows[0] ?? null;
}

async function getCharacterSkills(charId) {
  const rows = await query(
    `SELECT skillid, value
     FROM char_skills
     WHERE charid = ?`,
    [charId],
  );

  return rows;
}

async function getCharacterJobExp(charId) {
  const columns = JOB_EXP_COLUMNS.join(', ');
  const rows = await query(
    `SELECT charid, ${columns}
     FROM char_exp
     WHERE charid = ?
     LIMIT 1`,
    [charId],
  );

  return rows[0] ?? null;
}

async function getAccountRecord(accountId) {
  assertNeverExpose('accounts.password');

  const rows = await query(
    `SELECT id, login
     FROM accounts
     WHERE id = ?
     LIMIT 1`,
    [accountId],
  );

  return rows[0] ?? null;
}

async function loadOptional(label, loader) {
  try {
    return await loader();
  } catch (error) {
    console.error(`${label} lookup failed:`, error.message);
    return null;
  }
}

async function getAccountSession(accountId) {
  const rows = await query(
    `SELECT accid, charid
     FROM accounts_sessions
     WHERE accid = ?
     LIMIT 1`,
    [accountId],
  );

  return rows[0] ?? null;
}

function buildPublicCharacter(charRow, statsRow, expRow) {
  const mainJob = jobName(statsRow?.mjob);
  const subJob = jobName(statsRow?.sjob);

  const resolvedNation = nationName(charRow.nation);
  const resolvedZone = zoneName(charRow.zoneId);

  return {
    charname: charRow.charname,
    nation: resolvedNation,
    zoneId: charRow.zoneId,
    zone: resolvedZone,
    stats: {
      hp: statsRow?.hp ?? null,
      mp: statsRow?.mp ?? null,
      mjob: statsRow?.mjob ?? null,
      sjob: statsRow?.sjob ?? null,
      mlvl: statsRow?.mlvl ?? null,
      slvl: statsRow?.slvl ?? null,
      mainJob,
      subJob,
    },
    jobExp: expRow
      ? Object.fromEntries(JOB_EXP_COLUMNS.map((col) => [col, expRow[col] ?? 0]))
      : null,
  };
}

function buildProtectedCharacter(charRow, statsRow, expRow) {
  return {
    charid: charRow.charid,
    accid: charRow.accid,
    nationId: charRow.nation,
    stats: statsRow
      ? { charid: statsRow.charid }
      : null,
    jobExp: expRow
      ? { charid: expRow.charid }
      : null,
    ...buildPublicCharacter(charRow, statsRow, expRow),
  };
}

export async function getPublicGameDataForDiscord(discordId) {
  const link = await getLinkByDiscordId(discordId);
  if (!link) {
    return { linked: false };
  }

  const charRow = await getPrimaryCharacter(link.accountId);
  if (!charRow) {
    return { linked: true, character: null };
  }

  const [statsRow, expRow, jobsRow, expBase, missionsBlob, skillRows, pointsRow] = await Promise.all([
    loadOptional('char_stats', () => getCharacterStats(charRow.charid)),
    loadOptional('char_exp', () => getCharacterJobExp(charRow.charid)),
    loadOptional('char_jobs', () => getCharacterJobs(charRow.charid)),
    loadOptional('exp_base', () => getExpBaseByLevel()),
    loadOptional('chars.missions', () => getCharacterMissions(charRow.charid)),
    loadOptional('char_skills', () => getCharacterSkills(charRow.charid)),
    loadOptional('char_points', () => getCharacterPoints(charRow.charid)),
  ]);

  const character = buildPublicCharacter(charRow, statsRow, expRow);
  const jobs = buildJobList(jobsRow, expRow, expBase ?? new Map());
  const missions = buildProfileMissions(missionsBlob);
  const skills = buildProfileSkills(skillRows);
  const currencies = buildProfileCurrencies(pointsRow, charRow.nation);
  const crafting = buildProfileCrafting(pointsRow, charRow.nation);

  return {
    linked: true,
    character: {
      characterName: character.charname,
      nation: character.nation,
      zone: character.zone,
      jobLevel: formatJobLevel(character.stats),
      jobs,
      missions,
      skills,
      currencies,
      crafting,
      ...character,
    },
  };
}

export async function getProtectedAccountDataForDiscord(discordId) {
  const link = await getLinkByDiscordId(discordId);
  if (!link) {
    return { linked: false };
  }

  const [account, session, charRow] = await Promise.all([
    getAccountRecord(link.accountId),
    getAccountSession(link.accountId),
    getPrimaryCharacter(link.accountId),
  ]);

  if (!charRow) {
    return {
      linked: true,
      account: account
        ? { id: account.id, login: account.login }
        : null,
      session: session
        ? { accid: session.accid, charid: session.charid }
        : null,
      character: null,
    };
  }

  const [statsRow, expRow] = await Promise.all([
    getCharacterStats(charRow.charid),
    getCharacterJobExp(charRow.charid),
  ]);

  return {
    linked: true,
    account: account
      ? { id: account.id, login: account.login }
      : null,
    session: session
      ? { accid: session.accid, charid: session.charid }
      : null,
    character: buildProtectedCharacter(charRow, statsRow, expRow),
  };
}
