const WIKI_SOURCES = {
  bgwiki: {
    id: 'bgwiki',
    name: 'BG Wiki',
    apiUrl: 'https://www.bg-wiki.com/api.php',
    pageBaseUrl: 'https://www.bg-wiki.com/ffxi',
    siteOrigin: 'https://www.bg-wiki.com',
    attribution: 'Content adapted from BG Wiki (CC BY-SA)',
  },
  ffxiclopedia: {
    id: 'ffxiclopedia',
    name: 'FFXIclopedia',
    apiUrl: 'https://ffxiclopedia.fandom.com/api.php',
    pageBaseUrl: 'https://ffxiclopedia.fandom.com/wiki',
    siteOrigin: 'https://ffxiclopedia.fandom.com',
    attribution: 'Content adapted from FFXIclopedia Fandom (CC BY-SA)',
  },
  sanctum: {
    id: 'sanctum',
    name: 'Sanctum',
    pageBaseUrl: '/',
    siteOrigin: '',
    attribution: 'Sanctum Wiki',
    local: true,
  },
};

export function getWikiSource(sourceId) {
  const source = WIKI_SOURCES[sourceId];
  if (!source) {
    throw new Error(`Unknown wiki source: ${sourceId}`);
  }
  return source;
}

export function pageUrl(sourceId, title) {
  const source = getWikiSource(sourceId);
  if (source.local) {
    const params = new URLSearchParams({ title, source: sourceId });
    return `/?${params.toString()}`;
  }

  const encoded = encodeURIComponent(title.replace(/ /g, '_'));
  return `${source.pageBaseUrl}/${encoded}`;
}

export default WIKI_SOURCES;
