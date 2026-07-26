![logo](logo.png)

# Anikitty

Watch your favourite anime — anywhere, anytime. No ads.

Anikitty is a free, open-source anime streaming site built with **Next.js 14 App Router**, **TypeScript**, **Tailwind CSS**, and **PostgreSQL**. It pulls anime data from AniList and streams via KittyAPI.

---

## Features

- **No ads** — no popups, no redirects, no tracking
- **Spotlight hero** — auto-advancing carousel with keyboard navigation
- **Video player** — Vidstack-powered with:
  - Seekbar thumbnail previews (generated from the full episode in the background)
  - Skip Intro / Skip Credits buttons (AniSkip timestamps)
  - Auto-advance to next episode with 5-second countdown
  - Episode marked as watched when credits begin
  - Resume from where you left off across sessions
  - Sub / Dub toggle, multiple server providers
- **Episode playlist sidebar** — list, compact grid, and thumbnail views with watch progress bars
- **Continue Watching** — landscape thumbnail row with progress bars and time remaining
- **Anime detail pages** — banner hero, Alternative Titles, Studios, character roster, relations, season tabs
- **Comments** — per-anime discussion with:
  - Like / dislike (toggle off to remove)
  - Spoiler tags (blurred until clicked)
  - Edit your own comments
  - GIF attachments
- **User profiles** — watch activity, comment history, bookmarks
- **Schedule** — weekly airing calendar
- **Search** — full-text search across thousands of titles
- **PWA** — installable on mobile and desktop

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| Database | PostgreSQL via Drizzle ORM |
| State | Zustand + React Query |
| Player | Vidstack + HLS.js |
| Anime data | AniList GraphQL API |
| Streaming | KittyAPI |
| Skip times | AniSkip API |
| Deployment | Coolify (Docker / Railpack) |

---

## Local Development

### Prerequisites

- Node.js 18+
- PostgreSQL 14+ (or a Neon serverless connection string)

### Setup

```bash
git clone https://github.com/fampep/anikitty.git
cd anikitty
npm install
```

Copy the example env file and fill in your values:

```bash
cp .env.example .env.local
```

See `.env.example` for the full list with comments. Minimum for local dev:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/anikitty
NEXT_PUBLIC_APP_URL=http://localhost:3000
JWT_SECRET=                          # openssl rand -base64 48
KITTY_API_KEY=akitty_…                 # KittyAPI key — sent as X-API-Key header (server-only)
KLIPY_API_KEY=                         # KLIPY partner key for GIF search (https://partner.klipy.com)
```

Production also needs `ADMIN_PASSWORD`, `ADMIN_JWT_SECRET`, `TOTP_ENCRYPTION_KEY`, and `MESSAGE_ENCRYPTION_KEY` (see `.env.example`).

The database schema is created automatically on first startup via the instrumentation hook — no manual migrations needed.

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Deploy (Coolify)

Production deploys on Coolify support **Docker** or **Railpack**:

**Dockerfile** (recommended if Railpack cgroup issues persist):
1. Set **Build Pack** to **Dockerfile**
2. Expose port **3000**
3. Add production env vars (`DATABASE_URL`, `JWT_SECRET`, `KITTY_API_KEY`, etc.) as **runtime** variables
4. Only these need to be available at **build** time: `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_PROXY_URL`, `NEXT_PUBLIC_DONATION_RAISED_EUR`, `DISCORD_CLIENT_ID`
5. Do **not** pass `ADMIN_PASSWORD`, `DATABASE_URL`, or JWT secrets as build arguments — Coolify injects them into the Dockerfile and values with `#` break parsing

**Discord bot APIs** (standalone bot repo talks to these):

| Variable | Required | Purpose |
|---|---|---|
| `BOT_API_SECRET` | Recommended | Bearer secret for `GET /api/bot/*` — must match the bot’s `BOT_API_SECRET`. A hardcoded fallback exists so APIs work if unset; set this in Coolify (runtime) to override. |
| `DISCORD_BOT_SYNC_URL` | Optional | Bot `POST /sync` URL. Default fallback: `http://discord-bot:8787/sync` (Coolify private network; rename service to `discord-bot` or override). |
| `DISCORD_BOT_LEVELUP_URL` | Optional | Bot `POST /levelup` URL for channel embeds. Default: derived from sync URL (`/sync` → `/levelup`), i.e. `http://discord-bot:8787/levelup`. |

Protected routes: `/api/bot/online`, `/api/bot/search?q=`, `/api/bot/discord-links`, `GET/POST /api/bot/discord-role-map` (role keys: `admin`, `moderator`, `donator`, `timestamp_helper`, `level_*`), `GET/PUT /api/bot/guild-settings` (level-up channel), `POST /api/bot/discord-xp` (Discord chat XP for linked users; cooldown in `discord_chat_xp`). The bot creates Discord roles at runtime and persists snowflakes in `discord_role_map` — do not invent role IDs in config. Redeploy after merging so Coolify serves the new routes (otherwise production returns 404). Migrations for `discord_role_map` / `discord_guild_settings` / `discord_chat_xp` run via `migrateDb()` on site startup.

**Railpack** (faster builds when the host is configured):
1. Set **Build Pack** to **Railpack**
2. Config in `coolify.json` and `railpack.json`

Local Docker build:

```bash
docker build -t anikitty .
docker run -p 3000:3000 --env-file .env.local anikitty
```

#### Railpack cgroup error

If deploy fails with:

`cgroup-parent for systemd cgroup should be a valid slice named as "xxx.slice"`

that is a **Coolify host Docker** issue (not this repo). SSH into the VPS that runs Coolify.

**Option A — copy from your machine** (repo is private, so use SCP):

```bash
scp scripts/fix-coolify-railpack-cgroup.sh root@YOUR_VPS:/tmp/
ssh root@YOUR_VPS "sudo bash /tmp/fix-coolify-railpack-cgroup.sh"
```

**Option B — paste on the server** (no GitHub access needed):

```bash
sudo bash -s <<'EOF'
set -euo pipefail
DAEMON_JSON="/etc/docker/daemon.json"
SLICE_UNIT="/etc/systemd/system/docker.slice"
mkdir -p "$(dirname "$SLICE_UNIT")"
[ -f "$SLICE_UNIT" ] || printf '%s\n' '[Unit]' 'Description=Docker cgroup slice' 'Before=slices.target' >"$SLICE_UNIT" && systemctl daemon-reload
python3 - <<'PY'
import json, pathlib
path = pathlib.Path("/etc/docker/daemon.json")
data = json.loads(path.read_text()) if path.exists() else {}
parent = data.get("cgroup-parent") or data.get("cgroupParent")
if parent and not str(parent).endswith(".slice"):
    data.pop("cgroup-parent", None); data.pop("cgroupParent", None)
data["cgroup-parent"] = "docker.slice"
opts = list(data.get("exec-opts") or [])
if not any("native.cgroupdriver=systemd" in o for o in opts):
    opts.append("native.cgroupdriver=systemd")
data["exec-opts"] = opts
path.write_text(json.dumps(data, indent=2) + "\n")
PY
systemctl restart docker
sleep 4
docker buildx rm coolify-railpack 2>/dev/null || true
docker ps -aq --filter "name=buildx_buildkit_coolify-railpack" | xargs -r docker rm -f
docker buildx create --name coolify-railpack --driver docker-container --use 2>/dev/null || true
docker buildx inspect coolify-railpack --bootstrap
docker buildx du >/dev/null
echo "Done — redeploy in Coolify."
EOF
```

Then redeploy in Coolify. Confirm the service **Build Pack** is **Railpack**, not Dockerfile.

#### Docker build killed during compile (exit 255)

If deploy dies during `npm run build` / PWA compile with **no Next.js error** and exit code **255**, the build container was likely **OOM-killed**. The Dockerfile defaults to a 2 GB Node heap (`NODE_MAX_OLD_SPACE_SIZE=2048`) for smaller VPS hosts.

On the Coolify VPS:

1. **Environment** → mark `DATABASE_URL`, `JWT_*`, `ADMIN_PASSWORD`, API keys, etc. as **Runtime only** (not available at build time). Only `NEXT_PUBLIC_*` vars should be build-time. Values with `#` (e.g. passwords) break Docker `ARG` parsing and can corrupt other build args.
2. Ensure the host has enough free RAM/swap for a Next.js build (~3–4 GB peak).
3. Optionally raise heap in Coolify build env: `NODE_MAX_OLD_SPACE_SIZE=3072` (only if the VPS has headroom).
4. Or switch **Build Pack** to **Railpack** (`coolify.json` / `railpack.json`) if Dockerfile builds keep failing.

#### Docker export failed (exit 255)

If the Next.js build completes but deploy fails at `#18 exporting to image` with exit code **255**, the app code is fine — the Coolify host ran out of disk or BuildKit choked while saving the image.

On the Coolify VPS:

```bash
sudo bash scripts/fix-coolify-docker-export.sh
```

Or manually: `docker system prune -af`, `docker builder prune -af`, then redeploy.

Also in Coolify → your service → **Environment**: mark server secrets as **Runtime only** (unchecked for “Available at Build Time”). Only `NEXT_PUBLIC_*` vars should be build-time.

### Database

Tables are auto-created on server startup (`src/instrumentation.ts` → `migrateDb()`). To manually run the SQL against an existing database:

```sql
-- See src/db/migrate.ts for the full schema
CREATE TABLE IF NOT EXISTS users ( ... );
CREATE TABLE IF NOT EXISTS comments ( ... );
CREATE TABLE IF NOT EXISTS comment_votes ( ... );
-- etc.
```

---

## Contributing

```bash
# Fork the repo, then:
git clone <your-fork>
git checkout -b feat/your-feature
git commit -m "feat: describe your change"
git push origin feat/your-feature
# Open a pull request against master
```

---

## License

MIT
