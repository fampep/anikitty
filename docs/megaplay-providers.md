# MegaPlay provider (KittyAPI)

AniKitty streams through [KittyAPI](https://github.com/fampep/kittyapi). **MegaPlay** is a single provider — Anikoto, AnimeSogo, Anix, HiAnime, and Animepahe are internal backends behind merged search, not separate API providers.

AniKitty uses **stream-direct** only — one call with AniList ID + episode → HLS play URL. KittyAPI handles megaplay.buzz resolution server-side.

---

## Authentication

Every KittyAPI call requires:

```http
Authorization: Bearer YOUR_API_KEY
```

---

## Stream-direct (what AniKitty uses)

```http
GET /provider/MegaPlay/stream-direct?anilistId=1535&episode=1&audio=sub
```

For dub: `&audio=dub`

```json
{
  "file": "https://your-node/proxy?...",
  "allServers": [{ "quality": "1080p", "file": "..." }],
  "tracks": [{ "file": "...", "label": "English" }]
}
```

---

## Site example

```js
const API = 'https://kittyapi.176-125-240-251.sslip.io';
const headers = { Authorization: 'Bearer YOUR_API_KEY' };

const res = await fetch(
  `${API}/provider/MegaPlay/stream-direct?anilistId=1535&episode=1&audio=sub`,
  { headers }
);
const stream = await res.json();
video.src = stream.file;
```

---

## AniKitty integration

| Topic | Detail |
|-------|--------|
| Watch page | `GET /api/kitty/stream?provider=MegaPlay&anilistId=…&episode=…&audio=sub` → KittyAPI `stream-direct` |
| Default provider | `MegaPlay` (first in `DEFAULT_PROVIDER_PRIORITY`) |
| Legacy names | Saved `kittyProvider` values for Anikoto/AnimeSogo/Anix/HiAnime/Animepahe map to `MegaPlay` |
| Subtitles | `tracks[]` from stream-direct + Kitty `/subs` fallback |
| Quality | HLS manifest levels + `allServers` |
| `file` URL | Signed/proxied — pass directly to the HLS player |

Code paths:

- `src/lib/kitty/kitty-stream-api.ts` — `fetchKittyStreamDirect()` → `/provider/MegaPlay/stream-direct`
- `src/app/api/kitty/stream/route.ts` — generic provider handler for MegaPlay
- `src/lib/kitty/megaplay-providers.ts` — provider ID + legacy migration

---

## Minimal test (curl)

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
  "https://kittyapi.176-125-240-251.sslip.io/provider/MegaPlay/stream-direct?anilistId=1535&episode=1&audio=sub"
```

Cluster node test:

```bash
node --env-file=.env.local scripts/test-megaplay-nodes.mjs
```

Requires `KITTY_API_KEY` in `.env.local`.
