import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const banListPath = path.join(__dirname, '..', '..', '..', 'data', 'banned-addons.json');

let cache = null;
let cachedMtimeMs = 0;

// Reload when the file changes on disk so hand-edits apply without a restart.
export function getBannedAddons() {
  const stat = fs.statSync(banListPath);

  if (cache && stat.mtimeMs === cachedMtimeMs) {
    return cache;
  }

  const raw = fs.readFileSync(banListPath, 'utf8');
  cache = JSON.parse(raw);
  cachedMtimeMs = stat.mtimeMs;
  return cache;
}
