# AniKitty dedicated server (Go)

**APK product only.** This host does **accounts + watch-history sync**. It does **not** scrape or stream — that stays on the phone.

- Sign-in is required
- Accounts live only in this server’s database (username + password)
- **No** Discord login. AniList linking is finished on this server so the phone never holds the client secret.
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
# AniList code exchange. Copy anilist.env.example and set the secret only on the server.
export ANILIST_CLIENT_ID=56768
export ANILIST_CLIENT_SECRET='paste-the-secret-on-the-server'
export ANILIST_REDIRECT_URI='http://198.50.123.153:8788/api/v1/anilist/callback'
```

## API

| Method | Path | Auth |
|---|---|---|
| GET | `/health` | no |
| GET | `/api/v1/anilist/callback` | no — AniList redirects here with `code` |
| POST | `/api/v1/auth/signup` | no `{username,password}` |
| POST | `/api/v1/auth/login` | no `{username,password}` |
| POST | `/api/v1/auth/logout` | Bearer |
| GET | `/api/v1/auth/me` | Bearer |
| GET | `/api/v1/history` | Bearer |
| PUT | `/api/v1/history` | Bearer |
| DELETE | `/api/v1/history/{anilistId}` | Bearer |

Production deploy currently serves the APK default at `http://198.50.123.153:8788` (`systemd --user` unit `anikitty.service`). Override in the app login field if needed. Prefer HTTPS behind a reverse proxy when you harden the host.
