const ALLOWED_IMAGE_HOSTS = new Set([
  'static.wikia.nocookie.net',
  'images.wikia.nocookie.net',
  'vignette.wikia.nocookie.net',
  'www.bg-wiki.com',
  'bg-wiki.com',
]);

function isAllowedImageUrl(rawUrl) {
  let parsed;

  try {
    parsed = new URL(rawUrl);
  } catch {
    return false;
  }

  if (parsed.protocol !== 'https:') {
    return false;
  }

  return ALLOWED_IMAGE_HOSTS.has(parsed.hostname);
}

export async function fetchProxiedImage(rawUrl) {
  if (!isAllowedImageUrl(rawUrl)) {
    throw new Error('Image host is not allowed');
  }

  const response = await fetch(rawUrl, {
    headers: {
      'User-Agent': 'SanctumSite/0.1 (FFXI wiki image proxy)',
      Referer: rawUrl.includes('fandom.com') || rawUrl.includes('wikia.nocookie.net')
        ? 'https://ffxiclopedia.fandom.com/'
        : 'https://www.bg-wiki.com/',
    },
  });

  if (!response.ok) {
    throw new Error(`Image fetch failed (${response.status})`);
  }

  return {
    body: response.body,
    contentType: response.headers.get('content-type') ?? 'application/octet-stream',
    cacheControl: response.headers.get('cache-control') ?? 'public, max-age=86400',
  };
}

export function shouldProxyImageUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.hostname.endsWith('wikia.nocookie.net');
  } catch {
    return false;
  }
}

export function toProxiedImageUrl(url) {
  if (!shouldProxyImageUrl(url)) {
    return url;
  }

  return `/api/wiki/asset?url=${encodeURIComponent(url)}`;
}
