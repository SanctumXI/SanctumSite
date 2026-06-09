/**
 * Generates data/zones.json from LandSandBoat zone.h
 * Source: https://github.com/LandSandBoat/server/blob/base/src/map/zone.h
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT = path.join(__dirname, '..', 'data', 'zones.json');
const ZONE_H_URL = 'https://raw.githubusercontent.com/LandSandBoat/server/base/src/map/zone.h';

const DISPLAY_OVERRIDES = {
  'Southern Sandoria': "Southern San d'Oria",
  'Northern Sandoria': "Northern San d'Oria",
  'Port Sandoria': "Port San d'Oria",
  'Chateau Doraguille': "Chateau d'Oraguille",
  'Ruude Gardens': "Ru'Lude Gardens",
  'Rulude Gardens': "Ru'Lude Gardens",
  'San doria Jeuno Airship': "San d'Oria-Jeuno Airship",
  'San Doria Jeuno Airship': "San d'Oria-Jeuno Airship",
  Psoxja: "Pso'Xja",
};

function enumNameToDisplay(enumName) {
  const words = enumName.split('_');
  const titled = words.map((word, index) => {
    const lower = word.toLowerCase();
    if (index > 0 && ['of', 'the', 'and', 'in', 'on', 'at', 'to', 'for'].includes(lower)) {
      return lower;
    }
    if (/^\d+$/.test(word)) {
      return word;
    }
    return word.charAt(0) + word.slice(1).toLowerCase();
  }).join(' ');

  return DISPLAY_OVERRIDES[titled] ?? titled;
}

function parseZoneHeader(text) {
  const zones = {};
  const re = /ZONE_([A-Z0-9_]+)\s*=\s*(\d+)/g;
  let match = re.exec(text);

  while (match) {
    const id = Number(match[2]);
    zones[id] = enumNameToDisplay(match[1]);
    match = re.exec(text);
  }

  return zones;
}

async function loadZoneHeader() {
  const localPath = process.argv[2];
  if (localPath) {
    return fs.readFile(localPath, 'utf8');
  }

  const response = await fetch(ZONE_H_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch zone.h (${response.status})`);
  }

  return response.text();
}

const text = await loadZoneHeader();
const zones = parseZoneHeader(text);

await fs.mkdir(path.dirname(OUTPUT), { recursive: true });
await fs.writeFile(OUTPUT, `${JSON.stringify(zones, null, 2)}\n`, 'utf8');

console.log(`Wrote ${Object.keys(zones).length} zones to ${OUTPUT}`);
