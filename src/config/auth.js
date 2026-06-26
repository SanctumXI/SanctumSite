export function getAppUrl() {
  return (process.env.APP_URL ?? 'http://localhost:3000').replace(/\/$/, '');
}

export function getDiscordConfig() {
  const clientId = process.env.DISCORD_CLIENT_ID?.trim();
  const clientSecret = process.env.DISCORD_CLIENT_SECRET?.trim();
  const redirectUri = (process.env.DISCORD_REDIRECT_URI ?? `${getAppUrl()}/auth/discord/callback`).trim();

  return {
    clientId,
    clientSecret,
    redirectUri,
    // guilds.members.read lets us read the signed-in user's roles in our guild
    // (needed to gate the news-admin page). identify covers basic profile.
    scopes: ['identify', 'guilds.members.read'],
  };
}

// Discord guild + role that may post site news, plus the mirror webhook.
// All optional: if unset, news management is simply disabled (no one passes the gate).
export function getNewsConfig() {
  return {
    guildId: process.env.DISCORD_NEWS_GUILD_ID?.trim() || '',
    roleId: process.env.DISCORD_NEWS_ROLE_ID?.trim() || '',
    webhookUrl: process.env.DISCORD_NEWS_WEBHOOK_URL?.trim() || '',
  };
}

export function isDiscordAuthConfigured() {
  const { clientId, clientSecret } = getDiscordConfig();
  return Boolean(clientId && clientSecret);
}

export function getSessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET is required in production');
  }
  return secret ?? 'dev-only-session-secret-change-me';
}
