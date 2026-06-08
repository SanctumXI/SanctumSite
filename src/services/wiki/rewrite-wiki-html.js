import { toProxiedImageUrl } from './image-proxy.js';
import { adaptWikiHtmlForDarkMode } from './dark-mode-wiki-html.js';

function wikiPageHref(title, source) {
  const params = new URLSearchParams({ title, source });
  return `/?${params.toString()}`;
}

function decodeWikiTitle(encoded) {
  try {
    return decodeURIComponent(String(encoded).replace(/_/g, ' '));
  } catch {
    return String(encoded).replace(/_/g, ' ');
  }
}

function absolutizeUrl(url, origin) {
  if (!url) return url;
  if (/^(https?:|data:|mailto:|#)/i.test(url)) return url;
  if (url.startsWith('//')) return `https:${url}`;
  if (url.startsWith('/')) return `${origin}${url}`;
  return url;
}

function finalizeAssetUrl(url) {
  const absolute = url.startsWith('http') ? url : url;
  return toProxiedImageUrl(absolute);
}

function rewriteSrcset(srcset, origin) {
  return srcset
    .split(',')
    .map((entry) => {
      const trimmed = entry.trim();
      const spaceIndex = trimmed.search(/\s/);
      if (spaceIndex === -1) {
        return finalizeAssetUrl(absolutizeUrl(trimmed, origin));
      }

      const url = trimmed.slice(0, spaceIndex);
      const descriptor = trimmed.slice(spaceIndex);
      return `${finalizeAssetUrl(absolutizeUrl(url, origin))}${descriptor}`;
    })
    .join(', ');
}

function rewriteInAppWikiLinks(html) {
  let rewritten = html;

  rewritten = rewritten.replace(
    /href="https:\/\/www\.bg-wiki\.com\/ffxi\/([^"#?]+)"/gi,
    (_match, encoded) => `href="${wikiPageHref(decodeWikiTitle(encoded), 'bgwiki')}"`,
  );

  rewritten = rewritten.replace(
    /href="\/ffxi\/([^"#?]+)"/gi,
    (_match, encoded) => `href="${wikiPageHref(decodeWikiTitle(encoded), 'bgwiki')}"`,
  );

  rewritten = rewritten.replace(
    /href="https:\/\/ffxiclopedia\.fandom\.com\/wiki\/([^"#?]+)"/gi,
    (_match, encoded) => `href="${wikiPageHref(decodeWikiTitle(encoded), 'ffxiclopedia')}"`,
  );

  return rewritten;
}

function ensureImageReferrerPolicy(html) {
  return html.replace(/<img\b(?![^>]*\breferrerpolicy=)/gi, '<img referrerpolicy="no-referrer"');
}

export function stripExternalEditControls(html) {
  let stripped = html;

  stripped = stripped.replace(/<span class="mw-editsection[^"]*">[\s\S]*?<\/span>/gi, '');
  stripped = stripped.replace(/<a\b[^>]*href="[^"]*(?:action=edit|veaction=edit)[^"]*"[^>]*>[\s\S]*?<\/a>/gi, '');

  return stripped;
}

export function rewriteWikiHtml(html, siteOrigin, options = {}) {
  const origin = siteOrigin.replace(/\/$/, '');

  let rewritten = html.replace(
    /\s(src|href|poster)=("([^"]*)"|'([^']*)')/gi,
    (_match, attribute, _quoted, doubleValue, singleValue) => {
      const value = doubleValue ?? singleValue ?? '';
      const quote = doubleValue !== undefined ? '"' : "'";
      let next = absolutizeUrl(value, origin);
      if (attribute === 'src' || attribute === 'poster') {
        next = finalizeAssetUrl(next);
      }
      return ` ${attribute}=${quote}${next}${quote}`;
    },
  );

  rewritten = rewritten.replace(
    /\ssrcset=("([^"]*)"|'([^']*)')/gi,
    (_match, _quoted, doubleValue, singleValue) => {
      const value = doubleValue ?? singleValue ?? '';
      const quote = doubleValue !== undefined ? '"' : "'";
      return ` srcset=${quote}${rewriteSrcset(value, origin)}${quote}`;
    },
  );

  rewritten = rewritten.replace(
    /url\(\s*(['"]?)(\/[^)'"]+)\1\s*\)/gi,
    (_match, quote, path) => `url(${quote}${absolutizeUrl(path, origin)}${quote})`,
  );

  rewritten = rewriteInAppWikiLinks(rewritten);
  rewritten = ensureImageReferrerPolicy(rewritten);

  if (options.stripEditControls) {
    rewritten = stripExternalEditControls(rewritten);
  }

  if (options.darkMode !== false) {
    rewritten = adaptWikiHtmlForDarkMode(rewritten);
  }

  return rewritten;
}

export { wikiPageHref };
