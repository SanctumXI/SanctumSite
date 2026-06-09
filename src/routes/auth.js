import { Router } from 'express';
import { getAppUrl, isDiscordAuthConfigured } from '../config/auth.js';
import {
  buildDiscordAuthorizeUrl,
  createOAuthState,
  exchangeDiscordCode,
  fetchDiscordUser,
  toSessionUser,
} from '../services/auth/discord-oauth.js';
import { upsertFromDiscord } from '../services/profile/profile-store.js';

const router = Router();

router.get('/me', (req, res) => {
  if (req.session.user) {
    req.session.lastSeenAt = Date.now();
  }

  res.json({
    configured: isDiscordAuthConfigured(),
    user: req.session.user ?? null,
  });
});

router.get('/discord', (req, res) => {
  if (!isDiscordAuthConfigured()) {
    res.status(503).json({ error: 'Discord login is not configured on this server' });
    return;
  }

  const state = createOAuthState();
  req.session.oauthState = state;
  req.session.returnTo = typeof req.query.returnTo === 'string' ? req.query.returnTo : '/?view=profile';

  req.session.save((error) => {
    if (error) {
      res.redirect('/?auth=error');
      return;
    }

    res.redirect(buildDiscordAuthorizeUrl(state));
  });
});

router.get('/discord/callback', async (req, res) => {
  const { code, state, error } = req.query;

  if (error) {
    res.redirect('/?auth=denied');
    return;
  }

  if (!code || !state || state !== req.session.oauthState) {
    res.redirect('/?auth=error');
    return;
  }

  try {
    const token = await exchangeDiscordCode(String(code));
    const discordUser = await fetchDiscordUser(token.access_token);
    const sessionUser = toSessionUser(discordUser);
    req.session.user = sessionUser;
    try {
      await upsertFromDiscord(sessionUser);
    } catch (dbError) {
      console.error('Profile DB upsert failed (run sql/site-tables-upgrade.sql):', dbError.message);
    }
    delete req.session.oauthState;

    const returnTo = req.session.returnTo ?? '/';
    delete req.session.returnTo;

    req.session.save((saveError) => {
      if (saveError) {
        res.redirect('/?auth=error');
        return;
      }

      const destination = returnTo.startsWith('/') ? returnTo : '/';
      res.redirect(`${destination}${destination.includes('?') ? '&' : '?'}auth=success`);
    });
  } catch (callbackError) {
    console.error(callbackError);
    res.redirect('/?auth=error');
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy((error) => {
    if (error) {
      res.status(500).json({ error: 'Logout failed' });
      return;
    }

    res.clearCookie('sanctum.sid', { path: '/', httpOnly: true, sameSite: 'lax' });
    res.json({ ok: true });
  });
});

router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('sanctum.sid', { path: '/', httpOnly: true, sameSite: 'lax' });
    res.redirect(getAppUrl());
  });
});

export default router;
