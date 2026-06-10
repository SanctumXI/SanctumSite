import { query } from '../../config/database.js';
import { assertNeverExpose } from '../../config/field-policy.js';
import { getLinkByDiscordId } from './discord-link.js';
import { getExpBaseByLevel } from './exp-base.js';
import { buildJobList, JOB_EXP_COLUMNS } from './job-exp.js';
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

  const [statsRow, expRow, jobsRow, expBase] = await Promise.all([
    getCharacterStats(charRow.charid),
    getCharacterJobExp(charRow.charid),
    getCharacterJobs(charRow.charid),
    getExpBaseByLevel(),
  ]);

  const character = buildPublicCharacter(charRow, statsRow, expRow);
  const jobs = buildJobList(jobsRow, expRow, expBase);

  return {
    linked: true,
    character: {
      characterName: character.charname,
      nation: character.nation,
      zone: character.zone,
      jobLevel: formatJobLevel(character.stats),
      jobs,
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
