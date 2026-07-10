# MegaPlay provider (KittyAPI)

AniKitty streams through [KittyAPI](https://github.com/fampep/kittyapi). **MegaPlay** is a single provider — Anikoto, AnimeSogo, Anix, HiAnime, and Animepahe are internal backends behind merged search, not separate API providers.

Streams resolve through **megaplay.buzz** embed URLs → `getSources` → HLS (`lib/megaplay-api.js` → `resolveMegaPlayEmbed()`).

AniKitty uses **stream-direct** on the watch page because every episode already has an AniList ID.

---

## How it maps to megaplay.buzz

| MegaPlay docs | KittyAPI behavior |
|---------------|-------------------|
| `https://megaplay.buzz/stream/ani/{anilist}/{ep}/{sub\|dub}` | Built automatically from `anilist:{id}` |
| `https://megaplay.buzz/stream/mal/{mal}/{ep}/{sub\|dub}` | Fallback when MAL id is known |
| `https://megaplay.buzz/stream/s-2/{embed-id}/{sub\|dub}` | Supported when `episode_embed_id` is passed in `dataIds` |
| Embed → getSources → HLS | `resolveMegaPlayEmbed()` in KittyAPI |

---

## Authentication

Every KittyAPI call requires:

```http
Authorization: Bearer YOUR_API_KEY
```

---

## Request flow

### 1. Search (AniList titles → `anilist:{id}`)

```http
GET /provider/MegaPlay/search?q=death+note
```

```json
[
  { "title": "Death Note", "url": "anilist:1535", "hasSub": true, "hasDub": true }
]
```

### 2. Episodes

```http
GET /provider/MegaPlay/episodes?seriesUrl=anilist:1535
```

Uses AniList episode count and builds megaplay embed URLs, e.g.:

`https://megaplay.buzz/stream/ani/1535/1/sub`

### 3. Servers

```http
GET /provider/MegaPlay/servers?dataIds={dataIds}&audio=sub
```

```json
[
  {
    "name": "MegaPlay SUB",
    "id": "{\"embedUrl\":\"https://megaplay.buzz/stream/ani/1535/1/sub\",...}"
  }
]
```

### 4. Stream (resolves embed → HLS)

```http
GET /provider/MegaPlay/stream?linkId={linkId}
```

```json
{
  "file": "https://your-node/proxy?...",
  "allServers": [{ "quality": "1080p", "file": "..." }],
  "tracks": [{ "file": "...", "label": "English" }]
}
```

### Quick path (recommended)

```http
GET /provider/MegaPlay/stream-direct?anilistId=1535&episode=1&audio=sub
```

Same response shape as `/stream` — skips search/servers when you already have AniList ID + episode.

---

## Site example

```js
const API = 'https://kittyapi.176-125-240-251.sslip.io';
const headers = { Authorization: 'Bearer YOUR_API_KEY' };

// One call — Death Note ep 1
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
| Quality | HLS manifest levels + `allServers` for explicit quality pickers |
| Series ref | `anilist:{id}` (e.g. `anilist:1535`) |
| `file` URL | Signed/proxied — pass directly to the HLS player |

Code paths:

- `src/lib/kitty/kitty-stream-api.ts` — `fetchKittyStreamDirect()` → `/provider/MegaPlay/stream-direct`
- `src/app/api/kitty/stream/route.ts` — generic provider handler for MegaPlay
- `src/lib/kitty/megaplay-providers.ts` — stream path constants + legacy ID migration

---

## Full flow example

```js
async function api(path) {
  const res = await fetch(`${API}${path}`, { headers });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

const results = await api('/provider/MegaPlay/search?q=frieren');
const episodes = await api('/provider/MegaPlay/episodes?seriesUrl=anilist:154587');
const ep1 = episodes.find((e) => e.number === 1);
const servers = await api(
  `/provider/MegaPlay/servers?dataIds=${encodeURIComponent(ep1.dataIds)}&audio=sub`
);
const stream = await api(
  `/provider/MegaPlay/stream?linkId=${encodeURIComponent(servers[0].id)}`
);
video.src = stream.file;
```

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

---

## Important notes

| Topic | Detail |
|-------|--------|
| Series ref | `anilist:{id}` for episodes (e.g. `anilist:1535`) |
| Audio | `audio=sub` or `audio=dub` on servers/stream-direct |
| CORS | KittyAPI allows cross-origin browser fetch |
| `file` URL | Already signed/proxied — use directly in your HLS player |
| Qualities | `stream.allServers` for a quality selector |
| Health check | `GET /health` (requires API key) |

For most sites, **stream-direct is enough**: AniList ID + episode → play URL. Use the full flow only when you need server or quality picking in the UI.
