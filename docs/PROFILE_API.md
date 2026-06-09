# Profile API

## Pages

| URL | Who | UI |
|-----|-----|-----|
| `/?view=profile` | Signed-in user | **Own profile** — privacy toggles, link character, full Discord info |
| `/?view=profile&id={discordId}` | Anyone | **Public profile** — by Discord ID |
| `/?view=profile&character={charname}` | Anyone | **Public profile** — by linked character name (exact match) |

If you open your own public URL while signed in, the site redirects to `/?view=profile`.

Character name lookup only works when the character is **linked** to a Discord account (`site_discord_links` + `chars`).

## Endpoints

### Own profile (auth required)

```http
GET /api/profile/me
```

Session cookie or `Authorization: Bearer` token.

**Response highlights:**
- `view: "own"`
- `isOwner: true`
- `discord` — always includes avatar and username
- `privacy` — `{ showAvatar, showUsername }` (what others may see)
- `game` — linked character stats

```http
PATCH /api/profile/me
Content-Type: application/json

{ "showAvatar": true, "showUsername": false }
```

### Another player's profile (no auth required)

By Discord ID:

```http
GET /api/profile/{discordId}
```

By linked character name (exact match, URL-encoded):

```http
GET /api/profile/by-character/{characterName}
```

Optional auth: if the viewer is the owner, response matches `/me` instead.

**Response highlights:**
- `view: "public"`
- `isOwner: false`
- `discord.avatarUrl` — `null` if hidden
- `discord.username` — `null` if hidden
- `discord.globalName` — always present
- `game` — public character fields (no protected IDs)
- No `privacy` object exposed

### Errors

| Status | Meaning |
|--------|---------|
| `404` | No `site_discord_users` row (user never signed in on the site) |
| `401` | `/me` or `PATCH /me` without valid session/token |

## Opening a player profile from the launcher or site

By Discord ID:

```
https://yoursite.example/?view=profile&id=1513526784899940513
```

By character name (must be linked):

```
https://yoursite.example/?view=profile&character=Akyna
```

Or fetch JSON:

```http
GET /api/profile/1513526784899940513
GET /api/profile/by-character/Akyna
```
