# AniKitty dedicated server (Go)

**APK product only.** This host does **accounts + watch-history sync**. It does **not** scrape or stream — that stays on the phone.

- Sign-in is required
- Accounts live only in this server’s database (username + password)
- **No** Discord / AniList login
- Argon2id passwords, JWT sessions, rate-limited auth, revoked session checks

## Run on your laptop / VPS

```bash
cd apps/dedicated-server
export JWT_SECRET="$(openssl rand -base64 48)"   # required, >= 32 chars
go run ./cmd/server
# listens on :8788
```

Optional:

```bash
export LISTEN_ADDR=:8788
export DATABASE_URL='file:./data/anikitty.db?_fk=1&_journal_mode=WAL'
```

## API

| Method | Path | Auth |
|---|---|---|
| GET | `/health` | no |
| POST | `/api/v1/auth/signup` | no `{username,password}` |
| POST | `/api/v1/auth/login` | no `{username,password}` |
| POST | `/api/v1/auth/logout` | Bearer |
| GET | `/api/v1/auth/me` | Bearer |
| GET | `/api/v1/history` | Bearer |
| PUT | `/api/v1/history` | Bearer |
| DELETE | `/api/v1/history/{anilistId}` | Bearer |

Point the Android app **Server URL** at `http://YOUR_LAN_IP:8788` (or HTTPS behind a reverse proxy in production).
