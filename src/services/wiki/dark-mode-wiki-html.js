function expandHex(hex) {
  const value = hex.replace('#', '').trim();
  if (value.length === 3) {
    return value.split('').map((char) => char + char).join('');
  }
  return value;
}

function parseHexColor(value) {
  const match = value.match(/^#([0-9a-f]{3,8})$/i);
  if (!match) return null;

  const hex = expandHex(match[1]).slice(0, 6);
  if (!/^[0-9a-f]{6}$/i.test(hex)) return null;

  return {
    r: Number.parseInt(hex.slice(0, 2), 16),
    g: Number.parseInt(hex.slice(2, 4), 16),
    b: Number.parseInt(hex.slice(4, 6), 16),
  };
}

function parseRgbColor(value) {
  const match = value.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i);
  if (!match) return null;

  return {
    r: Number(match[1]),
    g: Number(match[2]),
    b: Number(match[3]),
  };
}

function parseColor(value) {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return null;

  const named = {
    white: { r: 255, g: 255, b: 255 },
    black: { r: 0, g: 0, b: 0 },
    silver: { r: 192, g: 192, b: 192 },
    gray: { r: 128, g: 128, b: 128 },
    grey: { r: 128, g: 128, b: 128 },
  };

  if (named[trimmed]) return named[trimmed];
  return parseHexColor(trimmed) ?? parseRgbColor(trimmed);
}

function extractColorFromValue(value) {
  const trimmed = value.trim();
  const hexMatch = trimmed.match(/#([0-9a-f]{3,8})/i);
  if (hexMatch) return parseHexColor(`#${hexMatch[1]}`);

  const rgbMatch = trimmed.match(/rgba?\([^)]+\)/i);
  if (rgbMatch) return parseRgbColor(rgbMatch[0]);

  return parseColor(trimmed);
}

function rgbToHex({ r, g, b }) {
  return `#${[r, g, b]
    .map((channel) => Math.round(Math.min(255, Math.max(0, channel))).toString(16).padStart(2, '0'))
    .join('')}`;
}

function rgbToHsl(r, g, b) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (delta !== 0) {
    s = delta / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case rn:
        h = ((gn - bn) / delta + (gn < bn ? 6 : 0)) * 60;
        break;
      case gn:
        h = ((bn - rn) / delta + 2) * 60;
        break;
      default:
        h = ((rn - gn) / delta + 4) * 60;
        break;
    }
  }

  return { h, s, l };
}

function hslToRgb(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let rn = 0;
  let gn = 0;
  let bn = 0;

  if (h < 60) [rn, gn, bn] = [c, x, 0];
  else if (h < 120) [rn, gn, bn] = [x, c, 0];
  else if (h < 180) [rn, gn, bn] = [0, c, x];
  else if (h < 240) [rn, gn, bn] = [0, x, c];
  else if (h < 300) [rn, gn, bn] = [x, 0, c];
  else [rn, gn, bn] = [c, 0, x];

  return {
    r: (rn + m) * 255,
    g: (gn + m) * 255,
    b: (bn + m) * 255,
  };
}

function relativeLuminance({ r, g, b }) {
  const transform = (channel) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };

  return 0.2126 * transform(r) + 0.7152 * transform(g) + 0.0722 * transform(b);
}

function replaceColorInValue(value, replacer) {
  let next = value;

  next = next.replace(/#([0-9a-f]{3,8})/gi, (match) => replacer(match) ?? match);
  next = next.replace(/rgba?\([^)]+\)/gi, (match) => replacer(match) ?? match);

  return next;
}

export function darkenWikiColor(input) {
  const rgb = typeof input === 'string' ? extractColorFromValue(input) : input;
  if (!rgb) return typeof input === 'string' ? input : null;

  const luminance = relativeLuminance(rgb);
  if (luminance <= 0.18) {
    return typeof input === 'string' ? input : rgbToHex(rgb);
  }

  const { h, s, l } = rgbToHsl(rgb.r, rgb.g, rgb.b);
  const tinted = s > 0.08 && h !== 0;

  let newLightness;
  if (l >= 0.82) {
    newLightness = tinted ? 0.24 : 0.2;
  } else if (l >= 0.65) {
    newLightness = tinted ? 0.19 : 0.16;
  } else if (l >= 0.45) {
    newLightness = tinted ? 0.15 : 0.13;
  } else {
    newLightness = Math.max(0.1, l * 0.45);
  }

  const newSaturation = tinted
    ? Math.min(0.55, Math.max(0.22, s * 0.85))
    : Math.min(0.08, s);

  return rgbToHex(hslToRgb(h, newSaturation, newLightness));
}

function rewriteStyleValue(style) {
  return style
    .split(';')
    .map((part) => {
      if (!part.trim()) return part;

      const colonIndex = part.indexOf(':');
      if (colonIndex === -1) return part;

      const property = part.slice(0, colonIndex).trim().toLowerCase();
      const value = part.slice(colonIndex + 1).trim();

      if (property === 'background' || property === 'background-color') {
        return `${part.slice(0, colonIndex)}:${replaceColorInValue(value, darkenWikiColor)}`;
      }

      if (property === 'border-color' || property === 'border') {
        return `${part.slice(0, colonIndex)}:${replaceColorInValue(value, (color) => {
          const rgb = extractColorFromValue(color);
          if (!rgb) return color;
          if (relativeLuminance(rgb) <= 0.18) return color;
          return darkenWikiColor(color);
        })}`;
      }

      if (property === 'color') {
        const rgb = extractColorFromValue(value);
        if (rgb && relativeLuminance(rgb) < 0.45) {
          return `${part.slice(0, colonIndex)}:#e8eef7`;
        }
      }

      return part;
    })
    .join(';');
}

export function adaptWikiHtmlForDarkMode(html) {
  let adapted = html;

  adapted = adapted.replace(/\sstyle=("([^"]*)"|'([^']*)')/gi, (_match, quoted, doubleValue, singleValue) => {
    const value = doubleValue ?? singleValue ?? '';
    const quote = doubleValue !== undefined ? '"' : "'";
    return ` style=${quote}${rewriteStyleValue(value)}${quote}`;
  });

  adapted = adapted.replace(/\sbgcolor=("([^"]*)"|'([^']*)')/gi, (_match, quoted, doubleValue, singleValue) => {
    const value = doubleValue ?? singleValue ?? '';
    const quote = doubleValue !== undefined ? '"' : "'";
    const dark = darkenWikiColor(value);
    return ` bgcolor=${quote}${dark}${quote}`;
  });

  return adapted;
}
