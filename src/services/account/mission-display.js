import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseMissionBlob } from './mission-parser.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MISSION_NAMES_PATH = path.join(__dirname, '..', '..', '..', 'data', 'missions.json');

export const PROFILE_MISSION_LOGS = [
  { area: 0, key: 'sandoria', label: "San d'Oria" },
  { area: 1, key: 'bastok', label: 'Bastok' },
  { area: 2, key: 'windurst', label: 'Windurst' },
  { area: 3, key: 'zilart', label: 'Rise of the Zilart' },
  { area: 4, key: 'toau', label: 'Treasures of Aht Urhgan' },
  { area: 5, key: 'wotg', label: 'Wings of the Goddess' },
  { area: 6, key: 'cop', label: 'Chains of Promathia' },
];

let missionNames = null;

function loadMissionNames() {
  if (missionNames) {
    return missionNames;
  }

  missionNames = JSON.parse(fs.readFileSync(MISSION_NAMES_PATH, 'utf8'));
  return missionNames;
}

function isMissionInactive(area, current) {
  if (area <= 2) {
    return current === 0xffff;
  }

  return current === 0;
}

function resolveMission(areaKey, missionId, area) {
  const names = loadMissionNames();
  const areaNames = names[areaKey];
  if (!areaNames) {
    return area <= 2 ? null : { name: `Mission ${missionId}`, wikiTitle: `Mission ${missionId}` };
  }

  const entry = areaNames[String(missionId)];
  if (!entry) {
    if (area <= 2) {
      return null;
    }
    const fallback = `Mission ${missionId}`;
    return { name: fallback, wikiTitle: fallback };
  }

  if (typeof entry === 'string') {
    return { name: entry, wikiTitle: entry };
  }

  return {
    name: entry.name,
    wikiTitle: entry.wikiTitle ?? entry.name,
  };
}

function buildWikiHref(wikiTitle) {
  if (!wikiTitle) {
    return null;
  }

  const params = new URLSearchParams({
    title: wikiTitle,
    source: 'bgwiki',
  });
  return `/?${params.toString()}`;
}

export function buildProfileMissions(missionsBlob) {
  const parsed = parseMissionBlob(missionsBlob);
  const byArea = new Map(parsed.map((entry) => [entry.area, entry]));

  return PROFILE_MISSION_LOGS.map(({ area, key, label }) => {
    const log = byArea.get(area);
    const current = log?.current ?? (area <= 2 ? 0xffff : 0);

    if (isMissionInactive(area, current)) {
      return {
        category: label,
        active: false,
        mission: null,
        missionLabel: 'Not started',
        wikiTitle: null,
        wikiHref: null,
      };
    }

    const resolved = resolveMission(key, current, area);
    if (!resolved) {
      return {
        category: label,
        active: false,
        mission: null,
        missionLabel: 'Not started',
        wikiTitle: null,
        wikiHref: null,
      };
    }

    return {
      category: label,
      active: true,
      missionId: current,
      mission: resolved.name,
      missionLabel: resolved.name,
      wikiTitle: resolved.wikiTitle,
      wikiHref: buildWikiHref(resolved.wikiTitle),
    };
  });
}
