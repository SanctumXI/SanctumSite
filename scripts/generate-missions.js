/**
 * Generates data/missions.json from LandSandBoat missions.lua
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT = path.join(__dirname, '..', 'data', 'missions.json');

const AREA_ENUMS = {
  SANDORIA: 'sandoria',
  BASTOK: 'bastok',
  WINDURST: 'windurst',
  ZILART: 'zilart',
  TOAU: 'toau',
  WOTG: 'wotg',
  COP: 'cop',
};

const NATION_LABELS = {
  sandoria: "San d'Oria",
  bastok: 'Bastok',
  windurst: 'Windurst',
};

const NATION_MISSION_CODE = {
  0: '1-1',
  1: '1-2',
  2: '1-3',
  3: '2-1',
  4: '2-2',
  5: '2-3',
  10: '3-1',
  11: '3-2',
  12: '3-3',
  13: '4-1',
  14: '5-1',
  15: '5-2',
  16: '6-1',
  17: '6-2',
  18: '7-1',
  19: '7-2',
  20: '8-1',
  21: '8-2',
  22: '9-1',
  23: '9-2',
};

const NAME_OVERRIDES = {
  Jeuno: 'Jeuno',
  Davoi: 'Davoi',
  Fei: 'Fei',
  Yin: 'Yin',
  Tnorg: 'Tavnazian Safehold',
};

function formatMissionKey(key) {
  if (key === 'NONE') {
    return null;
  }

  const words = key.split('_').map((word, index) => {
    const lower = word.toLowerCase();
    if (index > 0 && ['of', 'the', 'and', 'in', 'on', 'at', 'to', 'for', 'a'].includes(lower)) {
      return lower;
    }
    if (/^\d+$/.test(word)) {
      return word;
    }
    return word.charAt(0) + word.slice(1).toLowerCase();
  });

  const titled = words.join(' ');
  return NAME_OVERRIDES[titled] ?? titled;
}

function buildWikiTitle(areaKey, missionId, missionName) {
  if (NATION_LABELS[areaKey]) {
    const code = NATION_MISSION_CODE[missionId];
    if (code) {
      return `${NATION_LABELS[areaKey]} Mission ${code}`;
    }
  }

  return missionName;
}

function parseAreaBlock(content, enumName, areaKey) {
  const pattern = new RegExp(
    `\\[xi\\.mission\\.area\\[xi\\.mission\\.log_id\\.${enumName}\\]\\]\\s*=\\s*\\{([\\s\\S]*?)\\n\\s*\\},`,
    'm',
  );
  const match = content.match(pattern);
  if (!match) {
    return {};
  }

  const entries = {};
  const linePattern = /^\s*([A-Z0-9_]+)\s*=\s*(\d+)/gm;
  let lineMatch = linePattern.exec(match[1]);
  while (lineMatch) {
    const [, key, idValue] = lineMatch;
    const name = formatMissionKey(key);
    if (name) {
      const missionId = Number(idValue);
      entries[String(missionId)] = {
        name,
        wikiTitle: buildWikiTitle(areaKey, missionId, name),
      };
    }
    lineMatch = linePattern.exec(match[1]);
  }

  return entries;
}

async function resolveMissionsLua() {
  const candidates = [
    process.env.SANCTUMXI_PATH
      ? path.join(process.env.SANCTUMXI_PATH, 'scripts', 'globals', 'missions.lua')
      : null,
    path.join(__dirname, '..', '..', 'sanctumxi', 'scripts', 'globals', 'missions.lua'),
    'D:/sanctumxi/scripts/globals/missions.lua',
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      return await fs.readFile(candidate, 'utf8');
    } catch {
      // try next path
    }
  }

  const response = await fetch(
    'https://raw.githubusercontent.com/LandSandBoat/server/base/scripts/globals/missions.lua',
  );
  if (!response.ok) {
    throw new Error('Could not load missions.lua from local paths or GitHub');
  }
  return response.text();
}

async function main() {
  const content = await resolveMissionsLua();
  const missions = {};

  for (const [enumName, areaKey] of Object.entries(AREA_ENUMS)) {
    missions[areaKey] = parseAreaBlock(content, enumName, areaKey);
  }

  await fs.mkdir(path.dirname(OUTPUT), { recursive: true });
  await fs.writeFile(`${OUTPUT}`, `${JSON.stringify(missions, null, 2)}\n`, 'utf8');
  console.log(`Wrote ${OUTPUT}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
