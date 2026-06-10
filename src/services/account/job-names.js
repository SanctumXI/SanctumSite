const JOB_NAMES = {
  1: 'WAR', 2: 'MNK', 3: 'WHM', 4: 'BLM', 5: 'RDM', 6: 'THF',
  7: 'PLD', 8: 'DRK', 9: 'BST', 10: 'BRD', 11: 'RNG', 12: 'SAM',
  13: 'NIN', 14: 'DRG', 15: 'SMN', 16: 'BLU', 17: 'COR', 18: 'PUP',
  19: 'DNC', 20: 'SCH', 21: 'GEO', 22: 'RUN',
};

const NATION_NAMES = {
  0: "San d'Oria",
  1: 'Bastok',
  2: 'Windurst',
};

export function jobName(jobId) {
  return JOB_NAMES[jobId] ?? '—';
}

export function formatJobLevel(stats) {
  if (!stats) {
    return '—';
  }

  const { mlvl, slvl, mainJob, subJob } = stats;
  if (mlvl == null || !mainJob || mainJob === '—') {
    return '—';
  }

  const main = `${mlvl}${mainJob}`;
  if (!subJob || subJob === '—' || slvl == null) {
    return main;
  }

  return `${main}/${slvl}${subJob}`;
}

export function nationName(nationId) {
  return NATION_NAMES[nationId] ?? '—';
}
