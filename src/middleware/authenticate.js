import { verifyAccessToken } from '../services/auth/jwt-tokens.js';

export async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (authHeader?.startsWith('Bearer ')) {
    try {
      const token = authHeader.slice(7);
      const payload = await verifyAccessToken(token);
      req.auth = {
        discordId: payload.discordId,
        user: payload.user,
        source: 'jwt',
      };
      next();
      return;
    } catch {
      res.status(401).json({ error: 'Invalid or expired access token' });
      return;
    }
  }

  if (req.session?.user) {
    req.auth = {
      discordId: req.session.user.id,
      user: req.session.user,
      source: 'session',
    };
    next();
    return;
  }

  res.status(401).json({ error: 'Sign in required' });
}

export function optionalAuthenticate(req, _res, next) {
  const authHeader = req.headers.authorization;

  if (authHeader?.startsWith('Bearer ')) {
    verifyAccessToken(authHeader.slice(7))
      .then((payload) => {
        req.auth = {
          discordId: payload.discordId,
          user: payload.user,
          source: 'jwt',
        };
        next();
      })
      .catch(() => next());
    return;
  }

  if (req.session?.user) {
    req.auth = {
      discordId: req.session.user.id,
      user: req.session.user,
      source: 'session',
    };
  }

  next();
}
