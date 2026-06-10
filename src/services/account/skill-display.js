export const SKILL_CATEGORIES = [
  {
    key: 'combat',
    label: 'Combat',
    skillIds: [
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
      22, 23,
      25, 26, 27,
      28, 29, 30, 31,
    ],
  },
  {
    key: 'magic',
    label: 'Magic',
    skillIds: [
      24,
      32, 33, 34, 35, 36, 37, 38, 39,
      40, 41, 42, 43, 44, 45,
    ],
  },
  {
    key: 'crafting',
    label: 'Crafting',
    skillIds: [48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59],
  },
];

export const SKILL_NAMES = {
  1: 'Hand-to-Hand',
  2: 'Dagger',
  3: 'Sword',
  4: 'Great Sword',
  5: 'Axe',
  6: 'Great Axe',
  7: 'Scythe',
  8: 'Polearm',
  9: 'Katana',
  10: 'Great Katana',
  11: 'Club',
  12: 'Staff',
  22: 'Automaton Melee',
  23: 'Automaton Ranged',
  24: 'Automaton Magic',
  25: 'Archery',
  26: 'Marksmanship',
  27: 'Throwing',
  28: 'Guard',
  29: 'Evasion',
  30: 'Shield',
  31: 'Parry',
  32: 'Divine Magic',
  33: 'Healing Magic',
  34: 'Enhancing Magic',
  35: 'Enfeebling Magic',
  36: 'Elemental Magic',
  37: 'Dark Magic',
  38: 'Summoning Magic',
  39: 'Ninjutsu',
  40: 'Singing',
  41: 'String Instrument',
  42: 'Wind Instrument',
  43: 'Blue Magic',
  44: 'Geomancy',
  45: 'Handbell',
  48: 'Fishing',
  49: 'Woodworking',
  50: 'Smithing',
  51: 'Goldsmithing',
  52: 'Clothcraft',
  53: 'Leathercraft',
  54: 'Bonecraft',
  55: 'Alchemy',
  56: 'Cooking',
  57: 'Synergy',
  58: 'Riding',
  59: 'Digging',
};

export function formatSkillValue(rawValue) {
  const raw = Number(rawValue ?? 0);
  return (raw / 10).toFixed(1);
}

export function skillLevelProgress(rawValue) {
  const raw = Number(rawValue ?? 0);
  const skillFloat = raw / 10;
  const display = skillFloat.toFixed(1);
  const fraction = skillFloat - Math.floor(skillFloat);
  const progressPercent = Math.min(100, Math.max(0, Math.round(fraction * 1000) / 10));

  return {
    raw,
    display,
    progressPercent,
  };
}

export function buildProfileSkills(skillRows) {
  const valuesBySkillId = new Map(
    (skillRows ?? []).map((row) => [Number(row.skillid), Number(row.value ?? 0)]),
  );

  return SKILL_CATEGORIES.map(({ key, label, skillIds }) => ({
    category: label,
    key,
    skills: skillIds.map((skillId) => {
      const raw = valuesBySkillId.get(skillId) ?? 0;
      const progress = skillLevelProgress(raw);

      return {
        skillId,
        name: SKILL_NAMES[skillId] ?? `Skill ${skillId}`,
        value: progress.display,
        progressPercent: progress.progressPercent,
      };
    }),
  }));
}
