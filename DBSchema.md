# Database field policy

Fields are classified for API exposure. See [docs/LAUNCHER_AUTH.md](docs/LAUNCHER_AUTH.md) for launcher integration.

| Classification | Rule |
|----------------|------|
| **Never expose** | Must not appear in any API response |
| **Protected** | Requires Discord auth (session or launcher JWT) **and** `site_discord_links` ownership |
| **Non-protected** | May appear on public profile when linked; still requires auth for `/api/account/me/public` (owner only today) |

Transport: protected values are only served over **HTTPS** in production (`NODE_ENV=production`).

Implementation: `src/config/field-policy.js`, `src/services/account/game-account.js`

Website tables on `xidb`:

- **New install:** `sql/site-tables.sql`
- **Existing tables missing columns:** `sql/site-tables-upgrade.sql` (idempotent, safe to re-run)

- `site_discord_users` — Discord identity cache
- `site_discord_links` — Discord ↔ `accounts.id` mapping
- `site_profile_settings` — profile privacy toggles (`show_avatar`, `show_username`); owner always sees own Discord info
- `site_launcher_refresh_tokens` — launcher refresh token hashes

# Account Protected Values
- accounts.login
- accounts.password
- accounts.id
- accounts_sessions.accid (accounts.id)
- accounts_sessions.charid (chars.charid)
- chars.accid (accounts.id)
- chars.charid
- char_stats.charid(chars.charid)
- char_exp.charid (chars.charid)

# Non-Protected Values
- chars.charname
- chars.nation — returned as name: 0 = San d'Oria, 1 = Bastok, 2 = Windurst
- chars.pos_zone — returned as zone name via `data/zones.json` (from [LandSandBoat zone.h](https://github.com/LandSandBoat/server/blob/base/src/map/zone.h); regenerate with `npm run zones:generate`)
- char_stats.hp
- char_stats.mp
- char_stats.mjob
- char_stats.sjob
- char_stats.mlvl
- char_stats.slvl
- char_exp.war
- char_exp.mnk
- char_exp.whm
- char_exp.blm
- char_exp.rdm
- char_exp.thf
- char_exp.pld
- char_exp.drk
- char_exp.bst
- char_exp.brd
- char_exp.rng
- char_exp.sam
- char_exp.nin
- char_exp.drg
- char_exp.smn
- char_exp.blu
- char_exp.cor
- char_exp.pup
- char_exp.dnc
- char_exp.sch
- char_exp.geo
- char_exp.run