import { Router } from 'express';
import {
  getMarketPageData,
  getMarketSummaryForName,
} from '../services/market/market-service.js';

const router = Router();

router.get('/check', async (req, res) => {
  try {
    const name = String(req.query.name ?? req.query.title ?? '').trim();
    if (!name) {
      res.status(400).json({ error: 'name or title is required' });
      return;
    }

    const summary = await getMarketSummaryForName(name);
    res.json(summary);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Market check failed' });
  }
});

router.get('/item', async (req, res) => {
  try {
    const name = String(req.query.name ?? req.query.title ?? '').trim();
    if (!name) {
      res.status(400).json({ error: 'name or title is required' });
      return;
    }

    const data = await getMarketPageData(name);
    if (!data) {
      res.status(404).json({ error: 'Item not found in game database' });
      return;
    }

    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Could not load market data' });
  }
});

export default router;
