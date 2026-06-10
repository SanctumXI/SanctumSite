import { query } from '../../config/database.js';

let expBaseByLevel = null;

export async function getExpBaseByLevel() {
  if (expBaseByLevel) {
    return expBaseByLevel;
  }

  const rows = await query('SELECT level, exp FROM exp_base ORDER BY level ASC');
  expBaseByLevel = new Map(rows.map((row) => [Number(row.level), Number(row.exp)]));
  return expBaseByLevel;
}

export function expRequiredForLevel(expBase, level) {
  if (level == null) {
    return null;
  }
  return expBase.get(Number(level)) ?? null;
}
