import { Router } from 'express';
import { requireAuth } from '../middleware/require-auth.js';
import { resolveDiscordIdByCharacterName } from '../services/profile/profile-lookup.js';
import { getProfileForViewer } from '../services/profile/profile-service.js';
import { updatePrivacy, upsertFromDiscord } from '../services/profile/profile-store.js';

async function sendProfileForViewer(res, discordId, viewerDiscordId) {
  const profile = await getProfileForViewer(discordId, viewerDiscordId);
  if (!profile) {
    res.status(404).json({ error: 'Profile not found' });
    return;
  }

  res.json(profile);
}

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

router.get('/by-character/:characterName', async (req, res) => {
  try {
    const { discordId } = await resolveDiscordIdByCharacterName(
      decodeURIComponent(req.params.characterName),
    );
    const viewerDiscordId = req.auth?.discordId ?? req.session.user?.id ?? null;
    await sendProfileForViewer(res, discordId, viewerDiscordId);
  } catch (error) {
    const status = error.code === 'PROFILE_NOT_FOUND' ? 404 : 400;
    res.status(status).json({ error: error.message });
  }
});

router.get('/:discordId', async (req, res) => {
  const viewerDiscordId = req.auth?.discordId ?? req.session.user?.id ?? null;
  await sendProfileForViewer(res, req.params.discordId, viewerDiscordId);
});

export default router;
