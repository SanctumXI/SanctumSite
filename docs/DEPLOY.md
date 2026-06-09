# Deployment checklist

After `git pull` on the server host:

```bash
cd /path/to/SanctumSite
npm install          # required — installs jose, session-file-store, etc.
npm run zones:generate   # only if data/zones.json is missing
pm2 restart sanctum-site
pm2 logs sanctum-site --lines 50
```

## Required on the server

1. **`.env`** in the project root (not in git). Must include at minimum:
   - `SESSION_SECRET` (long random string) — **required** when `NODE_ENV=production`
   - `APP_URL` — your public site URL (`https://yoursite.example`)
   - `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`
   - `DISCORD_REDIRECT_URI` — `https://yoursite.example/auth/discord/callback`
   - Database vars (`DB_HOST`, `DB_USER`, etc.)

2. **`npm install`** after every pull that changes `package.json` / `package-lock.json`.

3. **Reverse proxy** (nginx/caddy) should set:
   - `X-Forwarded-Proto: https` when terminating TLS
   - Proxy to `http://127.0.0.1:3000` (or your `PORT`)

4. **Writable directories** (created automatically on startup):
   - `data/sessions/`
   - `data/profiles/`

## Diagnose a down site

```bash
pm2 status
pm2 logs sanctum-site --lines 100
curl -s http://127.0.0.1:3000/health
```

### Common failures

| Log message | Fix |
|-------------|-----|
| `Cannot find package 'jose'` | Run `npm install` |
| `SESSION_SECRET is required in production` | Add `SESSION_SECRET` to server `.env` |
| `EADDRINUSE` | Port in use — `pm2 delete` duplicate or change `PORT` |
| `.env file not found` | Copy `.env.example` to `.env` and fill in values |
| `data/zones.json missing` | Run `npm run zones:generate` |

## PM2

Use the included config so `cwd` and `NODE_ENV` are correct:

```bash
pm2 start ecosystem.config.cjs
```

Or ensure your existing PM2 app uses `cwd` pointing at the repo root so `src/load-env.js` finds `.env`.
