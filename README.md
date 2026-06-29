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
KITTY_API_KEY=                       # from KittyAPI
```

Production also needs `ADMIN_PASSWORD`, `ADMIN_JWT_SECRET`, `TOTP_ENCRYPTION_KEY`, and `MESSAGE_ENCRYPTION_KEY` (see `.env.example`).

The database schema is created automatically on first startup via the instrumentation hook — no manual migrations needed.

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

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
