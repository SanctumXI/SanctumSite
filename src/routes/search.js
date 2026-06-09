import { Router } from 'express';
import { suggestLinkedCharacters } from '../services/search/character-search.js';

const router = Router();

router.get('/suggest', async (req, res) => {
  try {
    const q = String(req.query.q ?? '').trim();
    const characters = await suggestLinkedCharacters(q);
    res.json({ query: q, suggestions: characters });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Search suggestions failed' });
  }
});

export default router;
