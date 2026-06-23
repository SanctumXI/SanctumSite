import './load-env.js';
import { ensureRuntimeDirs, validateStartup } from './startup-check.js';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDiscordConfig, isDiscordAuthConfigured } from './config/auth.js';
import { createSessionMiddleware } from './config/session.js';
import { verifyDiscordCredentials } from './services/auth/discord-oauth.js';
import indexRoutes from './routes/index.js';
import wikiRoutes from './routes/wiki.js';
import authRoutes from './routes/auth.js';
import profileRoutes from './routes/profile.js';
import accountRoutes from './routes/account.js';
import launcherAuthRoutes from './routes/launcher-auth.js';
import launcherBanlistRoutes from './routes/launcher-banlist.js';
import searchRoutes from './routes/search.js';
import marketRoutes from './routes/market.js';
import { securityHeaders } from './middleware/require-https.js';
import { optionalAuthenticate } from './middleware/authenticate.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, '..', 'public');
const indexHtml = path.join(publicDir, 'index.html');

ensureRuntimeDirs();
validateStartup();

const app = express();
const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? '0.0.0.0';
const isProduction = process.env.NODE_ENV === 'production';

if (isProduction) {
  app.set('trust proxy', 1);
}

app.use(express.json());
app.use(createSessionMiddleware());
app.use(securityHeaders);
app.use(optionalAuthenticate);
app.use(express.static(publicDir));

app.get('/', (_req, res) => {
  res.sendFile(indexHtml);
});

app.use('/', indexRoutes);
app.use('/api/wiki', wikiRoutes);
app.use('/auth', authRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/account', accountRoutes);
app.use('/api/auth/launcher', launcherAuthRoutes);

// Unlisted ban-list endpoint. Obscure path, queried only by the launcher.
const banlistRoute = process.env.LAUNCHER_BANLIST_ROUTE ?? '/api/launcher/integrity/3f9a1c7d';
app.use(banlistRoute, launcherBanlistRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/market', marketRoutes);

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: 'Internal server error' });
});

const server = app.listen(port, host, () => {
  console.log(`Sanctum site listening on http://${host}:${port}`);
  console.log(`Serving static files from ${publicDir}`);

  if (!isDiscordAuthConfigured()) {
    console.log('Discord login: NOT configured (set DISCORD_CLIENT_ID and DISCORD_CLIENT_SECRET in .env)');
    return;
  }

  console.log('Discord login: configured (checking credentials with Discord...)');
  verifyDiscordCredentials()
    .then((result) => {
      if (result.ok) {
        console.log('Discord login: credentials accepted by Discord');
        return;
      }

      if (result.reason === 'invalid_client') {
        const { clientId, redirectUri } = getDiscordConfig();
        console.error('Discord login: Discord rejected the client ID/secret pair (invalid_client)');
        console.error(`  Client ID sent: ${clientId}`);
        console.error(`  Redirect URI sent: ${redirectUri}`);
        console.error(`  App portal: https://discord.com/developers/applications/${clientId}`);
        console.error('  If the portal page loads but login still fails:');
        console.error('     1. OAuth2 -> Reset Client Secret, paste the new value into .env');
        console.error('     2. OAuth2 -> Redirects must include exactly: ' + redirectUri);
        console.error('     3. OAuth2 -> turn OFF "Requires OAuth2 Code Grant"');
        console.error('     4. If the portal page itself errors, create a new application');
        return;
      }

      console.error(`Discord login: credential check failed (${result.reason})`);
    })
    .catch((error) => {
      console.error('Discord login: could not reach Discord API to verify credentials', error);
    });
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use. Stop the other process or change PORT in .env`);
  } else {
    console.error('Server failed to start:', error);
  }
  process.exit(1);
});
