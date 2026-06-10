export const JOB_EXP_COLUMNS = [
  'war', 'mnk', 'whm', 'blm', 'rdm', 'thf', 'pld', 'drk', 'bst', 'brd',
  'rng', 'sam', 'nin', 'drg', 'smn', 'blu', 'cor', 'pup', 'dnc', 'sch', 'geo', 'run',
];

export const JOB_EXP_LABELS = {
  war: 'WAR',
  mnk: 'MNK',
  whm: 'WHM',
  blm: 'BLM',
  rdm: 'RDM',
  thf: 'THF',
  pld: 'PLD',
  drk: 'DRK',
  bst: 'BST',
  brd: 'BRD',
  rng: 'RNG',
  sam: 'SAM',
  nin: 'NIN',
  drg: 'DRG',
  smn: 'SMN',
  blu: 'BLU',
  cor: 'COR',
  pup: 'PUP',
  dnc: 'DNC',
  sch: 'SCH',
  geo: 'GEO',
  run: 'RUN',
};

export function buildJobList(jobsRow, expRow, expBase) {
  const jobs = [];

  for (const column of JOB_EXP_COLUMNS) {
    const level = Number(jobsRow?.[column] ?? 0);
    if (level <= 0) {
      continue;
    }

    const experience = Number(expRow?.[column] ?? 0);
    const toNextLevel = expBase.get(level + 1) ?? null;

    jobs.push({
      job: JOB_EXP_LABELS[column],
      level,
      experience,
      toNextLevel,
    });
  }

  jobs.sort((a, b) => b.level - a.level || a.job.localeCompare(b.job));
  return jobs;
}

export function pickRandomJobWithExp(expRow) {
  const eligible = JOB_EXP_COLUMNS.filter((column) => Number(expRow[column]) > 0);
  if (!eligible.length) {
    return null;
  }

  const column = eligible[Math.floor(Math.random() * eligible.length)];
  return {
    column,
    label: JOB_EXP_LABELS[column],
    experience: Number(expRow[column]),
  };
}
