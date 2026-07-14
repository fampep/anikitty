# MegaPlay & Anikoto (KittyAPI)

Both providers stream through [KittyAPI](https://github.com/fampep/kittyapi) using **AniList IDs** and an [anikototv.to](https://anikototv.to) site scrape. MAL IDs are not used.

| Provider | AniKitty label | Input | Backend |
|----------|----------------|-------|---------|
| **MegaPlay** | Alpha | AniList ID only | Delegates to Anikoto scrape |
| **Anikoto** | Kilo | AniList ID, slug, or watch URL | Direct anikototv scrape |

Functionally the same streams when both are called with `anilist:{id}`.

Every KittyAPI call requires:

```http
Authorization: Bearer YOUR_API_KEY
```

Keep the key on your backend only (`KITTY_API_KEY` in `.env.local`).

---

## AniKitty integration (watch page)

AniKitty uses **stream-direct** because every anime page has an AniList ID:

```
GET /api/kitty/stream?provider=MegaPlay&anilistId=11061&episode=23&audio=dub&title=Hunter%20x%20Hunter
  → KittyAPI GET /provider/MegaPlay/stream-direct?anilistId=11061&episode=23&audio=dub&title=Hunter%20x%20Hunter

GET /api/kitty/stream?provider=Anikoto&anilistId=11061&episode=23&audio=dub
  → KittyAPI GET /provider/Anikoto/stream-direct?anilistId=11061&episode=23&audio=dub&title=…
```

| Topic | Detail |
|-------|--------|
| Providers | `MegaPlay` and `Anikoto` are separate selectable sources |
| Playback | `stream-direct` only — `audio=sub` or `audio=dub` |
| Title | Anime name passed as `title` to help site catalog matching |
| Hard-sub | SUB track exposes `HS: …` server lines — use hardsub row in player |
| Subtitles | `tracks[]` from stream + `/subs?seriesUrl=anilist:{id}` |
| Episodes UI | AniList episode list — airing hints from Anikoto API cache |

Code paths:

- `src/lib/kitty/anilist-site-providers.ts` — shared AniList-first provider ids
- `src/lib/kitty/anilist-site-api.ts` — KittyAPI path builders + fetch helpers
- `src/lib/kitty/megaplay-api.ts` — MegaPlay wrappers
- `src/lib/kitty/anikoto-api.ts` — Anikoto wrappers
- `src/app/api/kitty/stream/route.ts` — watch page proxy (stream-direct for all active providers)

Legacy saved provider names (`AnimeSogo`, `Anix`, `HiAnime`, `Animepahe`) map to **MegaPlay** at runtime. **Anikoto** is its own provider and is not remapped.

---

## KittyAPI flow

### Site scrape (inside KittyAPI)

1. **Search** — AniList title search; results return `anilist:{id}` URLs.
2. **Episodes** — episode list from AniList (`number`, `title`, `hasSub`, `hasDub`).
3. **Site match** — provider searches anikototv.to and picks the catalog entry matching AniList title and **episode count** (e.g. Hunter × Hunter 2011 → AniList `11061`, 148 eps).
4. **Servers** — scraped from site AJAX (`/ajax/episode/list/…`, `/ajax/server/list`).
5. **Stream** — `/ajax/server?get={linkId}` → m3u8 + optional subtitle tracks.

Anikoto mirrors (in order): `anikototv.to`, `anikoto.cz`, `anikoto.me`, `anikoto.net`, `anikototv.se`.

### Servers (typical)

| Track | Server names |
|-------|----------------|
| SUB | VidPlay-1, HD-1, Vidstream-2, VidCloud-1 |
| H-SUB | Same pool, prefixed `HS:` in the API |
| DUB | HD-1, Vidstream-2, VidCloud-1, VidPlay-1 |

Dub streams come from the site's dub server list. If dub audio is not distinct from sub, dub servers are omitted (no fake dub fallback).

### Shortcut: stream-direct

```http
GET /provider/MegaPlay/stream-direct?anilistId=11061&episode=23&audio=dub&title=Hunter%20x%20Hunter
GET /provider/Anikoto/stream-direct?anilistId=11061&episode=23&audio=dub&title=Hunter%20x%20Hunter
GET /provider/MegaPlay/stream-direct?anilistId=1535&episode=1&audio=sub
```

Returns the same payload as `/stream`.

### Full flow (reference)

```http
GET /provider/MegaPlay/episodes?seriesUrl=anilist:11061
GET /provider/MegaPlay/servers?dataIds=<dataIds>&audio=dub
GET /provider/MegaPlay/stream?linkId=<id>
```

Pass `dataIds` and `linkId` unchanged — URL-encoded JSON from the previous step.

---

## Important don'ts

- Don't use MAL IDs for MegaPlay or Anikoto — **AniList only** for MegaPlay.
- Don't parse or rewrite `dataIds` / `linkId` JSON.
- Don't build anikototv URLs yourself — KittyAPI handles site scrape and mirrors.
- Don't map **Anikoto** to MegaPlay — they are separate providers in AniKitty.

---

## curl

```bash
KEY="your_api_key"
BASE="https://your-server.example.com"

curl -H "Authorization: Bearer $KEY" \
  "$BASE/provider/MegaPlay/stream-direct?anilistId=11061&episode=23&audio=dub&title=Hunter%20x%20Hunter"

curl -H "Authorization: Bearer $KEY" \
  "$BASE/provider/Anikoto/stream-direct?anilistId=11061&episode=23&audio=dub&title=Hunter%20x%20Hunter"

node --env-file=.env.local scripts/test-megaplay-nodes.mjs
```
