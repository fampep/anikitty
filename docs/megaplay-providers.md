# MegaPlay provider (KittyAPI)

AniKitty streams through [KittyAPI](https://github.com/fampep/kittyapi). **MegaPlay** is a single provider — Anikoto, AnimeSogo, Anix, HiAnime, and Animepahe are internal backends behind merged search, not separate API providers.

Every call requires:

```http
Authorization: Bearer YOUR_API_KEY
```

---

## API flow

```
GET /provider/MegaPlay/search?q=slime
GET /provider/MegaPlay/episodes?seriesUrl=catalog:8691
GET /provider/MegaPlay/servers?dataIds={...}&audio=sub
GET /provider/MegaPlay/servers?dataIds={...}&audio=dub
GET /provider/MegaPlay/stream-direct?anilistId=1535&episode=1&audio=sub
```

### 1. Search

```http
GET /provider/MegaPlay/search?q=slime
```

### 2. Episodes

Use `catalog:{id}` from the Anikoto API (e.g. Slime S4 → `catalog:8691`):

```http
GET /provider/MegaPlay/episodes?seriesUrl=catalog:8691
```

Each episode includes `dataIds` for the servers step.

### 3. Servers

Pass `dataIds` from the episode object — call once per audio track:

```http
GET /provider/MegaPlay/servers?dataIds={...}&audio=sub
GET /provider/MegaPlay/servers?dataIds={...}&audio=dub
```

### 4. Stream-direct

One-shot play URL when you already have AniList ID + episode (what AniKitty uses on the watch page):

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

## Example

```js
const API = 'https://kittyapi.176-125-240-251.sslip.io';
const headers = { Authorization: 'Bearer YOUR_API_KEY' };

// Full flow — catalog episodes + sub/dub servers
const results = await fetch(`${API}/provider/MegaPlay/search?q=slime`, { headers }).then((r) => r.json());
const episodes = await fetch(`${API}/provider/MegaPlay/episodes?seriesUrl=catalog:8691`, { headers }).then((r) => r.json());
const ep1 = episodes.find((e) => e.number === 1);
const dataIds = typeof ep1.dataIds === 'string' ? ep1.dataIds : JSON.stringify(ep1.dataIds);
const subServers = await fetch(`${API}/provider/MegaPlay/servers?dataIds=${encodeURIComponent(dataIds)}&audio=sub`, { headers }).then((r) => r.json());
const dubServers = await fetch(`${API}/provider/MegaPlay/servers?dataIds=${encodeURIComponent(dataIds)}&audio=dub`, { headers }).then((r) => r.json());

// Quick play — Death Note ep 1
const stream = await fetch(
  `${API}/provider/MegaPlay/stream-direct?anilistId=1535&episode=1&audio=sub`,
  { headers }
).then((r) => r.json());
video.src = stream.file;
```

---

## AniKitty integration

| Topic | Detail |
|-------|--------|
| Watch page | `GET /api/kitty/stream?provider=MegaPlay&anilistId=…&episode=…&audio=sub` → KittyAPI `stream-direct` |
| Default provider | `MegaPlay` (first in `DEFAULT_PROVIDER_PRIORITY`) |
| Legacy names | Anikoto / AnimeSogo / Anix / HiAnime / Animepahe → `MegaPlay` |
| Subtitles | `tracks[]` from stream-direct + Kitty `/subs` fallback |
| Quality | HLS manifest levels + `allServers` |
| `file` URL | Signed/proxied — pass directly to the HLS player |

Code paths:

- `src/lib/kitty/kitty-stream-api.ts` — `fetchKittyStreamDirect()` → `/provider/MegaPlay/stream-direct`
- `src/app/api/kitty/stream/route.ts` — generic provider handler for MegaPlay
- `src/lib/kitty/megaplay-providers.ts` — provider ID + legacy migration

---

## curl test

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
  "https://kittyapi.176-125-240-251.sslip.io/provider/MegaPlay/stream-direct?anilistId=1535&episode=1&audio=sub"
```

Cluster node test:

```bash
node --env-file=.env.local scripts/test-megaplay-nodes.mjs
```

Requires `KITTY_API_KEY` in `.env.local`.
