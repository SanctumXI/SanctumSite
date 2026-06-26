import { Router, raw } from 'express';
import { requireNewsAdmin } from '../middleware/require-news-admin.js';
import { createNews, deleteNews, getNewsItem, listNews, updateNews } from '../services/news/news-store.js';
import { mirrorNewsToDiscord } from '../services/news/news-webhook.js';
import { saveNewsImage } from '../services/news/news-uploads.js';

const router = Router();

// Role-gated: upload an image, return its served URL. Raw image bytes in, so the
// editor can replace pasted/dropped base64 with a lightweight same-origin URL.
router.post('/uploads', requireNewsAdmin, raw({ type: 'image/*', limit: '8mb' }), (req, res) => {
  try {
    const mime = String(req.headers['content-type'] ?? '').split(';')[0].trim();
    const url = saveNewsImage(req.body, mime);
    res.status(201).json({ url });
  } catch (error) {
    if (error.code === 'INVALID_IMAGE') {
      res.status(400).json({ error: error.message });
      return;
    }
    console.error(error);
    res.status(500).json({ error: 'Image upload failed' });
  }
});

// Public: latest news for the home feed.
router.get('/', async (req, res) => {
  try {
    const items = await listNews(req.query.limit);
    res.json({ items });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Could not load news' });
  }
});

// Public: single news item (webhook embeds deep-link here).
router.get('/:id', async (req, res) => {
  try {
    const item = await getNewsItem(req.params.id);
    if (!item) {
      res.status(404).json({ error: 'News item not found' });
      return;
    }
    res.json({ item });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Could not load news item' });
  }
});

// Role-gated: post a news item, then mirror to Discord.
router.post('/', requireNewsAdmin, async (req, res) => {
  try {
    const { title, body } = req.body ?? {};
    const item = await createNews({
      title,
      body,
      authorDiscordId: req.auth.discordId,
      authorName: req.auth.user.globalName ?? req.auth.user.username,
    });

    mirrorNewsToDiscord(item).catch((error) => {
      console.error('News webhook mirror failed:', error.message);
    });

    res.status(201).json({ item });
  } catch (error) {
    if (error.code === 'INVALID_NEWS') {
      res.status(400).json({ error: error.message });
      return;
    }
    console.error(error);
    res.status(500).json({ error: 'Could not post news' });
  }
});

// Role-gated: edit an existing news item.
router.patch('/:id', requireNewsAdmin, async (req, res) => {
  try {
    const { title, body } = req.body ?? {};
    const item = await updateNews(req.params.id, { title, body });
    if (!item) {
      res.status(404).json({ error: 'News item not found' });
      return;
    }
    res.json({ item });
  } catch (error) {
    if (error.code === 'INVALID_NEWS') {
      res.status(400).json({ error: error.message });
      return;
    }
    console.error(error);
    res.status(500).json({ error: 'Could not update news' });
  }
});

// Role-gated: delete a news item.
router.delete('/:id', requireNewsAdmin, async (req, res) => {
  try {
    const removed = await deleteNews(req.params.id);
    if (!removed) {
      res.status(404).json({ error: 'News item not found' });
      return;
    }
    res.json({ ok: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Could not delete news' });
  }
});

export default router;
