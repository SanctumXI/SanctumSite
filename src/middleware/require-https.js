const PROTECTED_PREFIXES = ['/api/account', '/api/auth/launcher'];

export function requireSecureTransport(req, res, next) {
  if (process.env.NODE_ENV !== 'production') {
    next();
    return;
  }

  const isProtected = PROTECTED_PREFIXES.some((prefix) => req.path.startsWith(prefix));
  if (!isProtected) {
    next();
    return;
  }

  const secure = req.secure || req.headers['x-forwarded-proto'] === 'https';
  if (!secure) {
    res.status(403).json({ error: 'HTTPS is required for protected account data' });
    return;
  }

  next();
}

export function securityHeaders(req, res, next) {
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'no-store');
  next();
}
