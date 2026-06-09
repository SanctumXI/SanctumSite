import { getAppUrl } from './auth.js';

export function getLauncherRedirectUri() {
  return (process.env.LAUNCHER_REDIRECT_URI ?? 'http://127.0.0.1:47832/auth/callback').trim();
}

export function getLauncherOAuthConfig() {
  const appUrl = getAppUrl();
  const redirectUri = getLauncherRedirectUri();

  return {
    redirectUri,
    allowedRedirectOrigins: [
      appUrl,
      'http://127.0.0.1',
      'http://localhost',
    ],
  };
}

export function isAllowedLauncherRedirectUri(uri) {
  if (!uri || typeof uri !== 'string') {
    return false;
  }

  try {
    const parsed = new URL(uri);
    if (parsed.protocol === 'sanctumxi:') {
      return parsed.pathname.endsWith('/callback') || parsed.host === 'auth';
    }

    if (parsed.protocol !== 'http:') {
      return false;
    }

    const host = parsed.hostname;
    return host === '127.0.0.1' || host === 'localhost';
  } catch {
    return false;
  }
}
