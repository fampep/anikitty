<p align="center">
  <img src="public/anikitty-logo.png" alt="AniKitty" width="160" />
</p>

<h1 align="center">AniKitty</h1>

<p align="center">
  <strong>Watch your favourite anime — anywhere, anytime. No ads.</strong>
</p>

<p align="center">
  <a href="https://github.com/fampep/anikitty/releases/tag/v1.0.0"><img src="https://img.shields.io/badge/Pre--release-1.0.0-orange?style=for-the-badge" alt="Pre-release 1.0.0" /></a>
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

> [!WARNING]
> **Work in progress.** AniKitty is under active development. The Android app and dedicated server are unfinished: expect bugs, missing features, broken playback on some titles, and breaking changes. The first GitHub build ([**v1.0.0 pre-release**](https://github.com/fampep/anikitty/releases/tag/v1.0.0)) is for early testing only — not a finished product.

<br />

AniKitty’s product is the **Android APK** + **Go dedicated server** (`apps/android`, `apps/dedicated-server`). Sign-in is required against **your** server DB (password-only; no Discord/AniList accounts). Users **select a built-in watch server** (not third-party extensions); the phone resolves a playable URL and streams on-device. The old website is not the product focus.

---

## Highlights

| | |
|---|---|
| **Android APK** | Compose app in `apps/android/` — sign in to your dedicated server |
| **On-device data** | Watch history in Room; optional sync to Go server |
| **Watch servers** | Built-in selectable servers (e.g. Anikoto) — URL resolve on phone, no 3rd-party installs |
| **Streaming** | Media3 on the phone; dedicated server never carries stream bytes |
| **No ads** | No popups, redirects, or trackers |
| **Web (optional)** | Legacy site stack — separate from the APK product |

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
| **Product (Android)** | Kotlin, Jetpack Compose, Room, AniList GraphQL (`apps/android/`) |
| API / web (optional) | Next.js 15 (App Router), TypeScript |
| Styling (web) | Tailwind CSS + shadcn/ui |
| Database | PostgreSQL via Drizzle ORM |
| State (web) | Zustand + React Query |
| Player (web) | Vidstack + HLS.js |
| Anime data | AniList GraphQL |
| Streaming | KittyAPI |
| Skip times | AniSkip |
| API deploy | Coolify (Docker / Railpack) |

---

## Android APK (local-first)

> Still **WIP** — use the [v1.0.0 pre-release](https://github.com/fampep/anikitty/releases/tag/v1.0.0) APK for early installs, or build from source:

```bash
cd apps/android
./gradlew :app:assembleRelease
adb install -r app/build/outputs/apk/release/app-release.apk
```

Or from the repo root: `npm run android:assembleDebug`.

See [`apps/android/README.md`](apps/android/README.md). Password-only sign-in against your dedicated server; watch history stays on-device (optional sync).

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
