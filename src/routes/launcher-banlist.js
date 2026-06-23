import { Router } from 'express';
import { getBannedAddons } from '../services/launcher/banned-addons.js';

const router = Router();

// Unlisted endpoint consumed only by the launcher. Not linked from the website.
// Path is obscured via LAUNCHER_BANLIST_ROUTE; see index.js mount.
router.get('/', (_req, res) => {
  try {
    const list = getBannedAddons();
    res.set('Cache-Control', 'no-store');
    res.json(list);
  } catch (error) {
    console.error('Banned-addons list unavailable:', error.message);
    res.status(503).json({ error: 'Ban list unavailable' });
  }
});

export default router;
