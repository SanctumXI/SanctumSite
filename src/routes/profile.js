import { Router } from 'express';
import { requireAuth } from '../middleware/require-auth.js';
import { getProfileForViewer } from '../services/profile/profile-service.js';
import { updatePrivacy, upsertFromDiscord } from '../services/profile/profile-store.js';

const router = Router();

router.get('/me', requireAuth, async (req, res) => {
  let profile = await getProfileForViewer(req.auth.discordId, req.auth.discordId);
  if (!profile) {
    await upsertFromDiscord(req.auth.user);
    profile = await getProfileForViewer(req.auth.discordId, req.auth.discordId);
  }

  if (!profile) {
    res.status(404).json({ error: 'Profile not found' });
    return;
  }

  res.json(profile);
});

router.patch('/me', requireAuth, async (req, res) => {
  const { showAvatar, showUsername } = req.body ?? {};

  if (showAvatar !== undefined && typeof showAvatar !== 'boolean') {
    res.status(400).json({ error: 'showAvatar must be a boolean' });
    return;
  }

  if (showUsername !== undefined && typeof showUsername !== 'boolean') {
    res.status(400).json({ error: 'showUsername must be a boolean' });
    return;
  }

  const updated = await updatePrivacy(req.auth.discordId, { showAvatar, showUsername });
  if (!updated) {
    res.status(404).json({ error: 'Profile not found' });
    return;
  }

  const profile = await getProfileForViewer(req.auth.discordId, req.auth.discordId);
  res.json(profile);
});

router.get('/:discordId', async (req, res) => {
  const viewerDiscordId = req.auth?.discordId ?? req.session.user?.id ?? null;
  const profile = await getProfileForViewer(req.params.discordId, viewerDiscordId);

  if (!profile) {
    res.status(404).json({ error: 'Profile not found' });
    return;
  }

  res.json(profile);
});

export default router;
