import WIKI_SOURCES, { getWikiSource, pageUrl } from '../../config/wiki-sources.js';
import { MediaWikiClient } from './mediawiki-client.js';
import {
  evaluatePage,
  getBaseBlocklist,
} from './wiki-filter.js';
import { rewriteWikiHtml } from './rewrite-wiki-html.js';
import { adaptWikiHtmlForDarkMode } from './dark-mode-wiki-html.js';
import {
  createSanctumPage,
  getSanctumPageByTitle,
  sanctumPageExists,
  searchSanctumPages,
  updateSanctumPage,
} from './sanctum-store.js';

const clients = new Map();
const expandedBlocklists = new Map();

const SOURCE_ORDER = ['sanctum', 'bgwiki', 'ffxiclopedia'];

function getClient(sourceId) {
  if (!clients.has(sourceId)) {
    clients.set(sourceId, new MediaWikiClient(sourceId));
  }
  return clients.get(sourceId);
}

async function getBlocklist(sourceId) {
  if (sourceId === 'sanctum') {
    return getBaseBlocklist(sourceId);
  }

  if (expandedBlocklists.has(sourceId)) {
    return expandedBlocklists.get(sourceId);
  }

  const blocklist = getBaseBlocklist(sourceId);
  if (sourceId === 'bgwiki') {
    const client = getClient(sourceId);
    await expandBlockedCategories(client, blocklist);
  }

  expandedBlocklists.set(sourceId, blocklist);
  return blocklist;
}

async function expandBlockedCategories(client, blocklist) {
  const queue = [...blocklist.categories];
  const visited = new Set(blocklist.categories);

  while (queue.length > 0) {
    const category = queue.shift();
    const subcats = await client.getCategoryMembers(category, { memberType: 'subcat' });

    for (const member of subcats) {
      if (!visited.has(member.title)) {
        visited.add(member.title);
        blocklist.categories.add(member.title);
        queue.push(member.title);
      }
    }
  }
}

async function externalPageExists(sourceId, title) {
  const blocklist = await getBlocklist(sourceId);
  const decision = evaluatePage({ title, blocklist });
  if (decision.exclude) return false;

  const client = getClient(sourceId);
  return client.pageExists(title);
}

export async function searchWiki(sourceId, query, limit = 10) {
  if (sourceId === 'sanctum') {
    const titles = await searchSanctumPages(query, limit);
    return titles.map((title) => ({
      source: 'sanctum',
      sourceName: getWikiSource('sanctum').name,
      title,
      url: pageUrl('sanctum', title),
    }));
  }

  const client = getClient(sourceId);
  const blocklist = await getBlocklist(sourceId);
  const titles = await client.search(query, limit * 2);

  const results = [];
  for (const title of titles) {
    const decision = evaluatePage({ title, blocklist });
    if (decision.exclude) continue;

    results.push({
      source: sourceId,
      sourceName: getWikiSource(sourceId).name,
      title,
      url: pageUrl(sourceId, title),
    });

    if (results.length >= limit) break;
  }

  return results;
}

export async function searchAllWikis(query, limitPerSource = 10) {
  const searches = SOURCE_ORDER.map((sourceId) =>
    searchWiki(sourceId, query, limitPerSource).catch(() => []),
  );

  const resultSets = await Promise.all(searches);
  const grouped = new Map();

  for (const result of resultSets.flat()) {
    const key = result.title.toLowerCase();
    if (!grouped.has(key)) {
      grouped.set(key, {
        title: result.title,
        sources: [],
      });
    }

    grouped.get(key).sources.push({
      source: result.source,
      sourceName: result.sourceName,
      url: result.url,
    });
  }

  return [...grouped.values()]
    .sort((a, b) => a.title.localeCompare(b.title));
}

export async function getWikiPage(sourceId, title) {
  if (sourceId === 'sanctum') {
    const stored = await getSanctumPageByTitle(title);
    if (!stored) return null;

    const source = getWikiSource('sanctum');
    return {
      source: 'sanctum',
      sourceName: source.name,
      title: stored.title,
      contentHtml: adaptWikiHtmlForDarkMode(stored.contentHtml),
      url: pageUrl('sanctum', stored.title),
      attribution: source.attribution,
      editable: true,
      slug: stored.slug,
      clonedFrom: stored.clonedFrom,
    };
  }

  const client = getClient(sourceId);
  const blocklist = await getBlocklist(sourceId);
  const page = await client.getParsedPage(title);

  if (!page) {
    return null;
  }

  const decision = evaluatePage({
    title: page.title,
    categories: page.categories,
    wikitext: page.wikitext,
    blocklist,
  });

  if (decision.exclude) {
    return { blocked: true, reason: decision.reason };
  }

  const source = getWikiSource(sourceId);

  return {
    source: sourceId,
    sourceName: source.name,
    title: page.title,
    contentHtml: rewriteWikiHtml(page.html, source.siteOrigin, { stripEditControls: true }),
    url: pageUrl(sourceId, page.title),
    attribution: source.attribution,
    editable: false,
  };
}

export async function resolveWikiPage(title, preferredSource = 'bgwiki') {
  const hasSanctumEntry = await sanctumPageExists(title);
  const externalSources = [];

  for (const sourceId of ['bgwiki', 'ffxiclopedia']) {
    if (await externalPageExists(sourceId, title)) {
      externalSources.push({
        source: sourceId,
        sourceName: getWikiSource(sourceId).name,
        url: pageUrl(sourceId, title),
      });
    }
  }

  if (!hasSanctumEntry && externalSources.length === 0) {
    return null;
  }

  const sourceIsAvailable = (source) => {
    if (source === 'sanctum') return hasSanctumEntry;
    return externalSources.some((entry) => entry.source === source);
  };

  const activeSource = sourceIsAvailable(preferredSource)
    ? preferredSource
    : (externalSources[0]?.source ?? 'sanctum');

  const page = await getWikiPage(activeSource, title);
  if (!page || page.blocked) {
    return null;
  }

  return {
    ...page,
    externalSources,
    hasSanctumEntry,
    canCreateSanctum: !hasSanctumEntry,
  };
}

export async function createSanctumEntryFromBgWiki(title) {
  if (await sanctumPageExists(title)) {
    return {
      created: false,
      page: await resolveWikiPage(title, 'sanctum'),
    };
  }

  const bgPage = await getWikiPage('bgwiki', title);
  if (!bgPage || bgPage.blocked) {
    throw new Error('No BG Wiki page available to clone for this title');
  }

  const stored = await createSanctumPage({
    title: bgPage.title,
    contentHtml: bgPage.contentHtml,
    clonedFrom: {
      source: 'bgwiki',
      title: bgPage.title,
      url: bgPage.url,
    },
  });

  return {
    created: true,
    page: await resolveWikiPage(stored.title, 'sanctum'),
  };
}

export async function saveSanctumEntry(slug, { title, contentHtml }) {
  const updated = await updateSanctumPage(slug, { title, contentHtml });
  if (!updated) {
    return null;
  }

  return resolveWikiPage(updated.title, 'sanctum');
}

export { WIKI_SOURCES as wikiSources };
