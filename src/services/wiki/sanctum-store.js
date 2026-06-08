import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WIKI_DIR = path.join(__dirname, '..', '..', '..', 'data', 'sanctum-wiki');

export function slugify(title) {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

async function ensureWikiDir() {
  await fs.mkdir(WIKI_DIR, { recursive: true });
}

function pagePath(slug) {
  return path.join(WIKI_DIR, `${slug}.json`);
}

export async function listSanctumPages() {
  await ensureWikiDir();
  const files = await fs.readdir(WIKI_DIR);
  const pages = [];

  for (const file of files) {
    if (!file.endsWith('.json')) continue;
    const raw = await fs.readFile(path.join(WIKI_DIR, file), 'utf8');
    pages.push(JSON.parse(raw));
  }

  return pages;
}

export async function getSanctumPageByTitle(title) {
  const slug = slugify(title);
  return getSanctumPageBySlug(slug);
}

export async function getSanctumPageBySlug(slug) {
  try {
    const raw = await fs.readFile(pagePath(slug), 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

export async function sanctumPageExists(title) {
  const page = await getSanctumPageByTitle(title);
  return Boolean(page);
}

export async function searchSanctumPages(query, limit = 10) {
  const needle = query.toLowerCase();
  const pages = await listSanctumPages();

  return pages
    .filter((page) => page.title.toLowerCase().includes(needle))
    .sort((a, b) => a.title.localeCompare(b.title))
    .slice(0, limit)
    .map((page) => page.title);
}

export async function createSanctumPage({ title, contentHtml, clonedFrom = null }) {
  await ensureWikiDir();

  const slug = slugify(title);
  const existing = await getSanctumPageBySlug(slug);
  if (existing) {
    return existing;
  }

  const now = new Date().toISOString();
  const page = {
    slug,
    title,
    contentHtml,
    clonedFrom,
    createdAt: now,
    updatedAt: now,
  };

  await fs.writeFile(pagePath(slug), JSON.stringify(page, null, 2), 'utf8');
  return page;
}

export async function updateSanctumPage(slug, { title, contentHtml }) {
  const page = await getSanctumPageBySlug(slug);
  if (!page) {
    return null;
  }

  const updated = {
    ...page,
    title: title ?? page.title,
    contentHtml: contentHtml ?? page.contentHtml,
    updatedAt: new Date().toISOString(),
  };

  if (title && slugify(title) !== slug) {
    const nextSlug = slugify(title);
    const conflict = await getSanctumPageBySlug(nextSlug);
    if (conflict && conflict.slug !== slug) {
      throw new Error('A Sanctum page with that title already exists');
    }

    updated.slug = nextSlug;
    await fs.writeFile(pagePath(nextSlug), JSON.stringify(updated, null, 2), 'utf8');
    await fs.unlink(pagePath(slug));
    return updated;
  }

  await fs.writeFile(pagePath(slug), JSON.stringify(updated, null, 2), 'utf8');
  return updated;
}
