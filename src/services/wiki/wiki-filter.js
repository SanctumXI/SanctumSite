const PRIVATE_SERVER_MARKERS = [
  '{{Private Server',
  '{{Private Server Guide',
  '{{private server',
  'Category:Private Server',
  'This article is related to Private Servers',
  'This article is related to the CatsEyeXI Private Server',
];

const DEFAULT_BLOCKLIST = {
  bgwiki: {
    categories: ['Category:Private Server'],
    titlePrefixes: ['CatsEyeXI/'],
    titlePatterns: [
      /^CatsEyeXI/i,
      /^Category:CatsEyeXI$/i,
      /^Private Server$/i,
      /^Template:Private Server$/i,
    ],
  },
  ffxiclopedia: {
    categories: [],
    titlePrefixes: [],
    titlePatterns: [],
  },
  sanctum: {
    categories: [],
    titlePrefixes: [],
    titlePatterns: [],
  },
};

function createBlocklist(sourceWiki) {
  const defaults = DEFAULT_BLOCKLIST[sourceWiki] ?? {
    categories: [],
    titlePrefixes: [],
    titlePatterns: [],
  };

  return {
    categories: new Set(defaults.categories),
    titlePrefixes: [...defaults.titlePrefixes],
    titlePatterns: [...defaults.titlePatterns],
  };
}

export function shouldExcludeByTitle(title, blocklist) {
  for (const prefix of blocklist.titlePrefixes) {
    if (title.startsWith(prefix)) {
      return { exclude: true, reason: `Title prefix match: ${prefix}` };
    }
  }

  for (const pattern of blocklist.titlePatterns) {
    if (pattern.test(title)) {
      return { exclude: true, reason: `Title pattern match: ${pattern}` };
    }
  }

  return { exclude: false };
}

export function shouldExcludeByCategories(categories, blocklist) {
  for (const category of categories) {
    if (blocklist.categories.has(category)) {
      return { exclude: true, reason: `Category match: ${category}` };
    }
  }

  return { exclude: false };
}

export function shouldExcludeByContent(wikitext) {
  for (const marker of PRIVATE_SERVER_MARKERS) {
    if (wikitext.includes(marker)) {
      return { exclude: true, reason: `Content marker: ${marker}` };
    }
  }

  return { exclude: false };
}

export function evaluatePage({ title, categories = [], wikitext = '', blocklist }) {
  const titleCheck = shouldExcludeByTitle(title, blocklist);
  if (titleCheck.exclude) return titleCheck;

  const categoryCheck = shouldExcludeByCategories(categories, blocklist);
  if (categoryCheck.exclude) return categoryCheck;

  if (wikitext) {
    const contentCheck = shouldExcludeByContent(wikitext);
    if (contentCheck.exclude) return contentCheck;
  }

  return { exclude: false };
}

export function getBaseBlocklist(sourceWiki) {
  return createBlocklist(sourceWiki);
}
