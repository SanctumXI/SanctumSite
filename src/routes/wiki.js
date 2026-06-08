import { Router } from 'express';
import { Readable } from 'node:stream';
import {
  createSanctumEntryFromBgWiki,
  getWikiPage,
  resolveWikiPage,
  saveSanctumEntry,
  searchAllWikis,
} from '../services/wiki/wiki-service.js';
import { fetchProxiedImage } from '../services/wiki/image-proxy.js';

const router = Router();

router.get('/asset', async (req, res, next) => {
  try {
    const url = String(req.query.url ?? '').trim();
    if (!url) {
      res.status(400).send('url is required');
      return;
    }

    const asset = await fetchProxiedImage(url);
    res.setHeader('Content-Type', asset.contentType);
    res.setHeader('Cache-Control', asset.cacheControl);
    Readable.fromWeb(asset.body).pipe(res);
  } catch (error) {
    if (error.message === 'Image host is not allowed') {
      res.status(403).send(error.message);
      return;
    }
    next(error);
  }
});

router.get('/search', async (req, res, next) => {
  try {
    const q = String(req.query.q ?? '').trim();
    if (!q) {
      res.json({ query: null, results: [] });
      return;
    }

    const results = await searchAllWikis(q);
    res.json({ query: q, results });
  } catch (error) {
    next(error);
  }
});

router.get('/page', async (req, res, next) => {
  try {
    const title = String(req.query.title ?? '').trim();
    const source = String(req.query.source ?? '').trim() || 'bgwiki';

    if (!title) {
      res.status(400).json({ error: 'title is required' });
      return;
    }

    const page = await resolveWikiPage(title, source);

    if (!page) {
      res.status(404).json({ error: 'Page not found' });
      return;
    }

    res.json(page);
  } catch (error) {
    next(error);
  }
});

router.post('/sanctum', async (req, res, next) => {
  try {
    const title = String(req.body?.title ?? '').trim();
    if (!title) {
      res.status(400).json({ error: 'title is required' });
      return;
    }

    const result = await createSanctumEntryFromBgWiki(title);
    const page = await resolveWikiPage(result.page.title, 'sanctum');
    res.status(result.created ? 201 : 200).json({
      created: result.created,
      page,
    });
  } catch (error) {
    if (error.message.includes('No BG Wiki page')) {
      res.status(404).json({ error: error.message });
      return;
    }
    next(error);
  }
});

router.put('/sanctum/:slug', async (req, res, next) => {
  try {
    const title = req.body?.title ? String(req.body.title).trim() : undefined;
    const contentHtml = req.body?.contentHtml ? String(req.body.contentHtml) : undefined;

    if (!contentHtml && !title) {
      res.status(400).json({ error: 'contentHtml or title is required' });
      return;
    }

    const page = await saveSanctumEntry(req.params.slug, { title, contentHtml });
    if (!page) {
      res.status(404).json({ error: 'Sanctum page not found' });
      return;
    }

    const resolved = await resolveWikiPage(page.title, 'sanctum');
    res.json(resolved);
  } catch (error) {
    next(error);
  }
});

router.get('/page/:source/:title', async (req, res, next) => {
  try {
    const title = decodeURIComponent(req.params.title);
    const page = await getWikiPage(req.params.source, title);

    if (!page) {
      res.status(404).json({ error: 'Page not found' });
      return;
    }

    if (page.blocked) {
      res.status(403).json({ error: 'Page excluded from this wiki', reason: page.reason });
      return;
    }

    res.json(page);
  } catch (error) {
    next(error);
  }
});

export default router;
