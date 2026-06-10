import { Router } from 'express';
import { requireAuth } from '../middleware/require-auth.js';
import { requireSecureTransport } from '../middleware/require-https.js';
import {
  assertDiscordAvailable,
  attachChallengeDiscordId,
  startLinkChallenge,
  verifyLinkChallenge,
} from '../services/account/account-linking.js';
import { getLinkByDiscordId } from '../services/account/discord-link.js';
import {
  getProtectedAccountDataForDiscord,
  getPublicGameDataForDiscord,
} from '../services/account/game-account.js';

const router = Router();

router.use(requireSecureTransport);

router.get('/me', requireAuth, async (req, res) => {
  try {
    const data = await getProtectedAccountDataForDiscord(req.auth.discordId);
    if (!data.linked) {
      res.status(404).json({ error: 'No game account linked to this Discord user' });
      return;
    }

    res.json({
      discordId: req.auth.discordId,
      authSource: req.auth.source,
      ...data,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Could not load account data' });
  }
});

router.post('/link/start', requireAuth, async (req, res) => {
  try {
    const existingLink = await getLinkByDiscordId(req.auth.discordId);
    if (existingLink) {
      res.status(400).json({
        error: 'This Discord account is already linked to a game account. Refresh the profile page to load your character data.',
      });
      return;
    }

    const { characterName } = req.body ?? {};
    const { challenge, prompt } = await startLinkChallenge(characterName);

    req.session.linkChallenge = attachChallengeDiscordId(challenge, req.auth.discordId);
    req.session.save((error) => {
      if (error) {
        res.status(500).json({ error: 'Could not start link verification' });
        return;
      }

      res.json(prompt);
    });
  } catch (error) {
    const status = error.code === 'CHARACTER_NOT_FOUND' ? 404 : 400;
    res.status(status).json({ error: error.message });
  }
});

router.post('/link/verify', requireAuth, async (req, res) => {
  try {
    await assertDiscordAvailable(req.auth.discordId);

    const { experience } = req.body ?? {};
    const challenge = req.session.linkChallenge;
    const result = await verifyLinkChallenge(challenge, experience, req.auth.discordId);

    delete req.session.linkChallenge;
    req.session.save((error) => {
      if (error) {
        res.status(500).json({ error: 'Account linked but session could not be updated' });
        return;
      }

      res.json(result);
    });
  } catch (error) {
    if (error.code === 'EXPERIENCE_MISMATCH' || error.code === 'CHALLENGE_EXPIRED') {
      delete req.session.linkChallenge;
      req.session.save(() => {
        res.status(400).json({ error: error.message });
      });
      return;
    }

    if (error.errno === 1062) {
      res.status(400).json({ error: 'That game account is already linked' });
      return;
    }

    res.status(400).json({ error: error.message });
  }
});

router.get('/me/public', requireAuth, async (req, res) => {
  try {
    const data = await getPublicGameDataForDiscord(req.auth.discordId);
    res.json({
      discordId: req.auth.discordId,
      ...data,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Could not load public character data' });
  }
});

export default router;
