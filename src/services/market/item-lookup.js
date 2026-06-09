import { query } from '../../config/database.js';

export async function resolveItemByName(name) {
  const trimmed = name?.trim();
  if (!trimmed) {
    return null;
  }

  const rows = await query(
    `SELECT itemid AS itemId, name
     FROM item_basic
     WHERE name = ? OR LOWER(name) = LOWER(?)
     LIMIT 2`,
    [trimmed, trimmed],
  );

  if (!rows.length) {
    return null;
  }

  if (rows.length > 1) {
    const exact = rows.find((row) => row.name === trimmed);
    if (exact) {
      return exact;
    }
  }

  return rows[0];
}
