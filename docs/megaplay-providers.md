# MegaPlay provider (KittyAPI)

AniKitty streams through [KittyAPI](https://github.com/fampep/kittyapi). **MegaPlay** is a single provider — Anikoto, AnimeSogo, Anix, HiAnime, and Animepahe are internal backends, not separate API providers.

AniKitty uses **Option B** (`stream-direct`) on the watch page because every episode already has an AniList ID. Use the full flow only when you need server or quality picking in custom UI.

---

## Two ways to play

### Option A — Full flow (search → pick server → stream)

Best when you want server/quality selection.

1. **Search**

```http
GET /provider/MegaPlay/search?q=death+note
```

2. **Episodes** (use AniList ID — easiest)

```http
GET /provider/MegaPlay/episodes?seriesUrl=anilist:1535
```

`1535` = Death Note. You can also pass `&audio=sub` or `&audio=dub`.

3. **Servers** (from episode `dataIds`)

```http
GET /provider/MegaPlay/servers?dataIds={dataIds}&audio=sub
```

4. **Stream** (from server `id` = `linkId`)

```http
GET /provider/MegaPlay/stream?linkId={linkId}
```

Response includes:

- `file` — proxied HLS URL (use this in your player)
- `allServers` — quality options (1080p, 720p, etc.)
- `tracks` — subtitles

### Option B — One-shot (fastest)

Skips search/servers if you already know AniList ID + episode:

```http
GET /provider/MegaPlay/stream-direct?anilistId=1535&episode=1&audio=sub
```

Same response shape as `/stream`.

---

## AniKitty integration

| Topic | Detail |
|-------|--------|
| Watch page | `GET /api/kitty/stream?provider=MegaPlay&anilistId=…&episode=…&audio=sub` → KittyAPI `stream-direct` |
| Default provider | `MegaPlay` (first in `DEFAULT_PROVIDER_PRIORITY`) |
| Legacy names | Saved `kittyProvider` values for Anikoto/AnimeSogo/Anix/HiAnime/Animepahe map to `MegaPlay` |
| Subtitles | `tracks[]` from stream-direct + Kitty `/subs` fallback |
| Quality | HLS player reads manifest levels; KittyAPI also returns `allServers` for explicit quality pickers |
| Series ref | Use `anilist:{id}` (e.g. `anilist:1535`) for episodes |
| `file` URL | Already signed/proxied — pass directly to the HLS player |

Code paths:

- `src/lib/kitty/kitty-stream-api.ts` — `fetchKittyStreamDirect()` → `/provider/MegaPlay/stream-direct`
- `src/app/api/kitty/stream/route.ts` — generic provider handler for MegaPlay
- `src/lib/kitty/megaplay-providers.ts` — provider metadata + legacy ID migration

---

## Frontend example (JavaScript)

```js
const API_BASE = 'https://kittyapi.176-125-240-251.sslip.io';
const API_KEY = 'akitty_your_key_here';
const headers = { Authorization: `Bearer ${API_KEY}` };

async function getMegaPlayStream(anilistId, episode = 1, audio = 'sub') {
  const url = `${API_BASE}/provider/MegaPlay/stream-direct?anilistId=${anilistId}&episode=${episode}&audio=${audio}`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

const stream = await getMegaPlayStream(1535, 1, 'sub');
video.src = stream.file;
console.log(stream.allServers); // [{ quality: '1080p', file: '...' }, ...]
console.log(stream.tracks);     // [{ file: '...', label: 'English', default: true }]
```

---

## Full flow example

```js
async function api(path) {
  const res = await fetch(`${API_BASE}${path}`, { headers });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

const results = await api('/provider/MegaPlay/search?q=frieren');
const episodes = await api('/provider/MegaPlay/episodes?seriesUrl=anilist:154587');
const ep1 = episodes.find(e => e.number === 1);
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

Node test script (all cluster nodes):

```bash
node --env-file=.env.local scripts/test-megaplay-nodes.mjs
```

Requires `KITTY_API_KEY` in `.env.local`.

---

## Important notes

| Topic | Detail |
|-------|--------|
| Series ref | Use `anilist:{id}` (e.g. `anilist:1535`) for episodes |
| Audio | `audio=sub` or `audio=dub` on servers/stream-direct |
| CORS | API allows cross-origin — browser fetch works from your site |
| `file` URL | Already signed/proxied — pass directly to your HLS player |
| Qualities | Use `stream.allServers` to build a quality selector |
| Health check | `GET /health` (also needs API key) |

For most sites, **stream-direct is enough**: AniList ID + episode number → play URL. Use the full flow only if you need server or quality picking in the UI.
