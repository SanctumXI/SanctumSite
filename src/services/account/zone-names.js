import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const zonesPath = path.join(__dirname, '..', '..', '..', 'data', 'zones.json');

let zoneMap = null;

function loadZoneMap() {
  if (zoneMap) {
    return zoneMap;
  }

  const raw = fs.readFileSync(zonesPath, 'utf8');
  zoneMap = JSON.parse(raw);
  return zoneMap;
}

export function zoneName(zoneId) {
  if (zoneId == null || zoneId === '') {
    return '—';
  }

  const id = Number(zoneId);
  if (Number.isNaN(id)) {
    return '—';
  }

  const name = loadZoneMap()[String(id)] ?? loadZoneMap()[id];
  return name ?? `Unknown Zone (${id})`;
}

export function getZoneLookup() {
  return { ...loadZoneMap() };
}
