import { Router } from 'express';
import { getDistributedAddons } from '../services/launcher/distributed-addons.js';

const router = Router();

// Unlisted endpoint consumed only by the launcher. Not linked from the website.
// Path is obscured via LAUNCHER_DISTRIBUTED_ROUTE; see index.js mount.
router.get('/', (_req, res) => {
  try {
    const list = getDistributedAddons();
    res.set('Cache-Control', 'no-store');
    res.json(list);
  } catch (error) {
    console.error('Distributed-addons list unavailable:', error.message);
    res.status(503).json({ error: 'Distributed addons list unavailable' });
  }
});

export default router;
