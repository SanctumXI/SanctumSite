import { Router } from 'express';
import { isDiscordAuthConfigured } from '../config/auth.js';
import { isAllowedLauncherRedirectUri } from '../config/launcher.js';
import { requireAuth } from '../middleware/require-auth.js';
import { requireSecureTransport } from '../middleware/require-https.js';
import { upsertDiscordUser, getDiscordUser } from '../services/account/discord-user.js';
import { getProtectedAccountDataForDiscord } from '../services/account/game-account.js';
import {
  exchangeDiscordCodeWithPkce,
  fetchDiscordUser,
  toSessionUser,
} from '../services/auth/discord-oauth.js';
import { signAccessToken } from '../services/auth/jwt-tokens.js';
import {
  consumeRefreshToken,
  issueRefreshToken,
  storeRefreshToken,
} from '../services/auth/launcher-tokens.js';
import { upsertFromDiscord } from '../services/profile/profile-store.js';

const router = Router();

router.use(requireSecureTransport);

function tokenResponse(sessionUser, refreshToken) {
  return signAccessToken(sessionUser).then((accessToken) => ({
    tokenType: 'Bearer',
    accessToken,
    refreshToken,
    expiresIn: Number(process.env.JWT_ACCESS_TTL_SEC ?? 3600),
  }));
}

router.post('/token', async (req, res) => {
  if (!isDiscordAuthConfigured()) {
    res.status(503).json({ error: 'Discord login is not configured' });
    return;
  }

  const { code, codeVerifier, redirectUri } = req.body ?? {};

  if (!code || !codeVerifier || !redirectUri) {
    res.status(400).json({ error: 'code, codeVerifier, and redirectUri are required' });
    return;
  }

  if (!isAllowedLauncherRedirectUri(redirectUri)) {
    res.status(400).json({ error: 'redirectUri is not allowed for launcher OAuth' });
    return;
  }

  try {
    const token = await exchangeDiscordCodeWithPkce(String(code), redirectUri, String(codeVerifier));
    const discordUser = await fetchDiscordUser(token.access_token);
    const sessionUser = toSessionUser(discordUser);

    try {
      await upsertFromDiscord(sessionUser);
    } catch (dbError) {
      console.error('Profile DB upsert failed (run sql/site-tables-upgrade.sql):', dbError.message);
    }

    const refreshToken = issueRefreshToken();
    try {
      await storeRefreshToken(sessionUser.id, refreshToken);
    } catch (dbError) {
      console.error('Refresh token storage failed (run sql/site-tables.sql):', dbError.message);
      res.status(503).json({ error: 'Launcher token storage is not available' });
      return;
    }

    const payload = await tokenResponse(sessionUser, refreshToken);
    res.json({
      ...payload,
      discordAccessToken: token.access_token,
    });
  } catch (error) {
    console.error(error);
    res.status(401).json({ error: 'Discord authentication failed' });
  }
});

router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body ?? {};

  if (!refreshToken) {
    res.status(400).json({ error: 'refreshToken is required' });
    return;
  }

  try {
    const consumed = await consumeRefreshToken(String(refreshToken));
    if (!consumed) {
      res.status(401).json({ error: 'Invalid or expired refresh token' });
      return;
    }

    const storedUser = await getDiscordUser(consumed.discordId);
    if (!storedUser) {
      res.status(401).json({ error: 'Discord user not found' });
      return;
    }

    const sessionUser = {
      id: storedUser.discordId,
      username: storedUser.username,
      globalName: storedUser.globalName,
      avatarUrl: storedUser.avatarUrl,
    };

    const nextRefreshToken = issueRefreshToken();
    await storeRefreshToken(sessionUser.id, nextRefreshToken);
    const payload = await tokenResponse(sessionUser, nextRefreshToken);
    res.json(payload);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Could not refresh launcher token' });
  }
});

router.get('/game-login', requireAuth, async (req, res) => {
  try {
    const data = await getProtectedAccountDataForDiscord(req.auth.discordId);
    if (!data.linked || !data.account) {
      res.status(404).json({ error: 'No game account linked to this Discord user' });
      return;
    }

    res.json({
      accountId: data.account.id,
      login: data.account.login,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Could not resolve game account for login' });
  }
});

export default router;
