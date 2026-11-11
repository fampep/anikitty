<p align="center">
  <img src="public/anikitty-logo.png" alt="AniKitty" width="160" />
</p>

<h1 align="center">AniKitty</h1>

<p align="center">
  <strong>Watch your favourite anime — anywhere, anytime. No ads.</strong>
</p>

<p align="center">
  <a href="https://github.com/fampep/anikitty/stargazers"><img src="https://img.shields.io/github/stars/fampep/anikitty?style=for-the-badge&logo=github&logoColor=white&color=0ea5e9" alt="Stars" /></a>
  <a href="https://github.com/fampep/anikitty/blob/main/LICENSE"><img src="https://img.shields.io/github/license/fampep/anikitty?style=for-the-badge&color=0284c7" alt="License" /></a>
  <a href="https://nodejs.org"><img src="https://img.shields.io/badge/Node.js-24+-0ea5e9?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js 24+" /></a>
  <a href="https://nextjs.org"><img src="https://img.shields.io/badge/Next.js-14-0284c7?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js 14" /></a>
  <a href="https://www.typescriptlang.org"><img src="https://img.shields.io/badge/TypeScript-5-0ea5e9?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" /></a>
</p>

<p align="center">
  <a href="https://t.me/Anikittymoe"><img src="https://img.shields.io/badge/Telegram-Anikittymoe-28A8E9?style=for-the-badge&logo=telegram&logoColor=white" alt="Telegram" /></a>
  <a href="https://github.com/fampep/anikitty/issues"><img src="https://img.shields.io/badge/Issues-welcome-0369a1?style=for-the-badge&logo=github&logoColor=white" alt="Issues" /></a>
</p>

<br />

AniKitty is moving to an **Android APK product** (Kotlin / Jetpack Compose under `apps/android/`). The Next.js deploy remains the **API/backend** (auth, catalog, streams, admin) and an optional web client — not a Capacitor/TWA wrap of the site.

---

## Highlights

| | |
|---|---|
| **Android-first** | Native Compose scaffold in `apps/android/` — debug APK build path lives there |
| **No ads** | No popups, redirects, or trackers |
| **Passphrase + passkeys** | New accounts use a one-time passphrase; sign-in is passkey-first (web today; Credential Manager planned on Android) |
| **Access gating** | Catalog and watch require login; signups open or closed via `OPEN_SIGNUPS` |
| **Player** | Web: Vidstack + HLS; Android playback (Media3) comes in a later milestone |
| **Library** | Continue watching, bookmarks, schedule, search, profiles, comments |
| **API backend** | Coolify-hosted Next.js serves `/api/**` for the APK (and current web UI) |

---

## Access & accounts

The site is gated: guests see the landing page; everything else needs an account.

| Mode | How to set | Behavior |
|---|---|---|
| **Closed** (default) | `OPEN_SIGNUPS` unset / `false` | Login works; new signups blocked; UI links to [Telegram](https://t.me/Anikittymoe) |
| **Open** | `OPEN_SIGNUPS=true` (runtime) | Passphrase signup + Discord / AniList account creation |

- **Signup** — generates a passphrase (no email/password form). Save it; it’s the account recovery secret.
- **Sign-in** — passkey first, passphrase backup; legacy password + recover still works for older accounts.
- **Telegram waitlist** — `https://t.me/Anikittymoe` when signups are closed.

Set `OPEN_SIGNUPS` as a **runtime** Coolify variable (not build-time).

---

## Stack

| Layer | Technology |
|---|---|
| **Product (Android)** | Kotlin, Jetpack Compose, OkHttp (`apps/android/`) |
| API / web backend | Next.js 15 (App Router), TypeScript |
| Styling (web) | Tailwind CSS + shadcn/ui |
| Database | PostgreSQL via Drizzle ORM |
| State (web) | Zustand + React Query |
| Player (web) | Vidstack + HLS.js |
| Anime data | AniList GraphQL |
| Streaming | KittyAPI |
| Skip times | AniSkip |
| API deploy | Coolify (Docker / Railpack) |

---

## Android APK (scaffold)

```bash
cd apps/android
./gradlew :app:assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

Or from the repo root: `npm run android:assembleDebug`.

See [`apps/android/README.md`](apps/android/README.md) for SDK setup, auth/API consumption, and signing placeholders. Full feature port is **not** done in the scaffold PR.

---

## Local development (API / web)

### Prerequisites

- Node.js **24+**
- PostgreSQL 14+ (or a Neon connection string)

### Setup

```bash
git clone https://github.com/fampep/anikitty.git
cd anikitty
npm install
cp .env.example .env.local
# optional local Postgres:
docker compose up -d db
```

Minimum for local (see `.env.example` for the full list):

```env
DATABASE_URL=postgresql://anikitty:anikitty@localhost:5432/anikitty
NEXT_PUBLIC_APP_URL=http://localhost:3000
JWT_SECRET=                          # openssl rand -base64 48
KITTY_API_KEY=akitty_…               # X-API-Key (server-only)
KLIPY_API_KEY=                       # GIF search — https://partner.klipy.com
OPEN_SIGNUPS=true                    # false/unset = closed + Telegram CTA
```

Production also needs `ADMIN_PASSWORD`, `ADMIN_JWT_SECRET`, `TOTP_ENCRYPTION_KEY`, and `MESSAGE_ENCRYPTION_KEY`.

Schema is created on first startup via instrumentation — no manual migrations.

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Deploy (Coolify)

Supports **Docker** (recommended when Railpack cgroup issues persist) or **Railpack**.

### Dockerfile

1. Build pack → **Dockerfile**, expose **3000**
2. Runtime env: `DATABASE_URL`, `JWT_SECRET`, `KITTY_API_KEY`, `OPEN_SIGNUPS`, …
3. Build-time only: `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_PROXY_URL`, `NEXT_PUBLIC_DONATION_RAISED_EUR`, `DISCORD_CLIENT_ID`
4. Do **not** pass secrets with `#` as Docker build args — they break parsing

```bash
docker build -t anikitty .
docker run -p 3000:3000 --env-file .env.local anikitty
```

### Discord bot APIs

| Variable | Required | Purpose |
|---|---|---|
| `BOT_API_SECRET` | Recommended | Bearer for `GET /api/bot/*` |
| `DISCORD_BOT_SYNC_URL` | Optional | Default `http://discord-bot:8787/sync` |
| `DISCORD_BOT_LEVELUP_URL` | Optional | Derived from sync URL (`/levelup`) |

Routes: `/api/bot/online`, `/search`, `/discord-links`, `/discord-role-map`, `/guild-settings`, `/discord-xp`. Role snowflakes live in `discord_role_map` — don’t invent IDs in config.

### Railpack

Build pack → **Railpack**; config in `coolify.json` / `railpack.json`.

<details>
<summary><strong>Railpack cgroup error</strong></summary>

If deploy fails with `cgroup-parent for systemd cgroup should be a valid slice named as "xxx.slice"`, fix the Coolify host Docker config:

**Option A — from your machine**

```bash
scp scripts/fix-coolify-railpack-cgroup.sh root@YOUR_VPS:/tmp/
ssh root@YOUR_VPS "sudo bash /tmp/fix-coolify-railpack-cgroup.sh"
```

**Option B — paste on the server**

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

Then redeploy with Build Pack **Railpack**.

</details>

<details>
<summary><strong>Docker OOM / export failures (exit 255)</strong></summary>

- **Compile killed (255, no Next error)** — usually OOM. Mark secrets runtime-only; ensure ~3–4 GB free RAM; optional `NODE_MAX_OLD_SPACE_SIZE=3072`.
- **Export failed after a successful build** — prune on the host:

```bash
sudo bash scripts/fix-coolify-docker-export.sh
```

Or `docker system prune -af` and `docker builder prune -af`, then redeploy.

</details>

### Database

Tables auto-create on startup (`src/instrumentation.ts` → `migrateDb()`). Full schema lives in `src/db/migrate.ts`.

---

## Contributing

```bash
git clone <your-fork>
git checkout -b feat/your-feature
git commit -m "feat: describe your change"
git push origin feat/your-feature
# Open a PR against main
```

---

## License

[MIT](LICENSE)
