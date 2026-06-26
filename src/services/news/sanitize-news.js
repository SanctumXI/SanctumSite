import sanitizeHtml from 'sanitize-html';

// Quill (snow theme) emits these block/inline tags plus ql-* classes for
// alignment/font/size/indent and inline styles for color/background.
// We allow exactly that surface and nothing else — no scripts, no event
// handlers, no iframes, no arbitrary styles.
const QL_CLASS = /^ql-(align|font|size|indent|direction)-[\w-]+$/;

const SANITIZE_OPTIONS = {
  allowedTags: [
    'p', 'br', 'span', 'strong', 'em', 'u', 's', 'sub', 'sup',
    'blockquote', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ol', 'ul', 'li', 'a', 'img', 'pre', 'code', 'hr',
  ],
  allowedAttributes: {
    a: ['href', 'target', 'rel'],
    img: ['src', 'alt', 'width', 'height'],
    '*': ['class', 'style'],
  },
  allowedClasses: {
    '*': [QL_CLASS],
  },
  allowedStyles: {
    '*': {
      color: [/^#(0x)?[0-9a-f]+$/i, /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/],
      'background-color': [/^#(0x)?[0-9a-f]+$/i, /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/],
      'text-align': [/^(left|right|center|justify)$/],
    },
  },
  // Links: only safe schemes, and force external links to open safely.
  allowedSchemes: ['http', 'https', 'mailto'],
  allowedSchemesByTag: {
    img: ['http', 'https'],
  },
  transformTags: {
    a: (tagName, attribs) => ({
      tagName,
      attribs: {
        ...attribs,
        target: '_blank',
        rel: 'noopener noreferrer nofollow',
      },
    }),
  },
};

export function sanitizeNewsHtml(dirty) {
  return sanitizeHtml(String(dirty ?? ''), SANITIZE_OPTIONS);
}

// Plain-text projection (used for empty-check and the Discord webhook embed).
export function htmlToText(html) {
  return sanitizeHtml(String(html ?? ''), { allowedTags: [], allowedAttributes: {} })
    .replace(/\s+/g, ' ')
    .trim();
}
