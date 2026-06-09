import crypto from 'node:crypto';
import { getDiscordConfig } from '../../config/auth.js';

const DISCORD_API = 'https://discord.com/api';
const DISCORD_AUTHORIZE_URL = 'https://discord.com/oauth2/authorize';

export function createOAuthState() {
  return crypto.randomBytes(24).toString('hex');
}

export async function verifyDiscordCredentials() {
  const { clientId, clientSecret, redirectUri } = getDiscordConfig();
  if (!clientId || !clientSecret) {
    return { ok: false, reason: 'missing' };
  }
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'authorization_code',
    code: 'sanctum-credential-check',
    redirect_uri: redirectUri,
  });

  const response = await fetch(`${DISCORD_API}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  const data = await response.json();
  if (data.error === 'invalid_grant') {
    return { ok: true };
  }

  if (data.error === 'invalid_client') {
    return { ok: false, reason: 'invalid_client' };
  }

  return { ok: false, reason: data.error ?? 'unknown' };
}

export function buildDiscordAuthorizeUrl(state, options = {}) {
  const { clientId, redirectUri: defaultRedirectUri, scopes } = getDiscordConfig();
  const redirectUri = options.redirectUri ?? defaultRedirectUri;
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: scopes.join(' '),
    state,
  });

  if (options.codeChallenge) {
    params.set('code_challenge', options.codeChallenge);
    params.set('code_challenge_method', 'S256');
  }

  return `${DISCORD_AUTHORIZE_URL}?${params.toString()}`;
}

export async function exchangeDiscordCodeWithPkce(code, redirectUri, codeVerifier) {
  const { clientId, clientSecret } = getDiscordConfig();

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
  });

  const response = await fetch(`${DISCORD_API}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error_description ?? data.error ?? 'Discord token exchange failed');
  }

  return data;
}

export async function exchangeDiscordCode(code) {
  const { clientId, clientSecret, redirectUri } = getDiscordConfig();

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
  });

  const response = await fetch(`${DISCORD_API}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error_description ?? data.error ?? 'Discord token exchange failed');
  }

  return data;
}

export async function fetchDiscordUser(accessToken) {
  const response = await fetch(`${DISCORD_API}/users/@me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message ?? 'Discord user lookup failed');
  }

  return data;
}

export function toSessionUser(discordUser) {
  const avatarUrl = discordUser.avatar
    ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png?size=64`
    : `https://cdn.discordapp.com/embed/avatars/${Number(discordUser.discriminator ?? 0) % 5}.png`;

  return {
    id: discordUser.id,
    username: discordUser.username,
    globalName: discordUser.global_name ?? discordUser.username,
    avatarUrl,
  };
}
