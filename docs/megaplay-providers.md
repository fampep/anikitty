# MegaPlay provider (KittyAPI)

AniKitty streams through [KittyAPI](https://github.com/fampep/kittyapi). **MegaPlay** is a single unified provider — Anikoto, AnimeSogo, Anix, HiAnime, and Animepahe are internal backends behind merged search, not separate API providers.

KittyAPI resolves **megaplay.buzz** embed URLs → `getSources` → HLS behind the scenes. AniKitty uses **stream-direct** on the watch page (AniList ID + episode) and lets KittyAPI walk the s-2 → ani → mal fallback chain server-side.

---

## 1. MegaPlay embed URLs (megaplay.buzz)

These are what KittyAPI resolves internally (AniKitty never loads megaplay.buzz in the player). Best → fallback:

| Route | Link format | Example |
|-------|-------------|---------|
| **s-2** (best — from Anikoto catalog) | `https://megaplay.buzz/stream/s-2/{episode_embed_id}/{sub\|dub}` | `https://megaplay.buzz/stream/s-2/169702/sub` |
| **AniList** | `https://megaplay.buzz/stream/ani/{anilist-id}/{ep}/{sub\|dub}` | `https://megaplay.buzz/stream/ani/1535/1/sub` |
| **MAL** | `https://megaplay.buzz/stream/mal/{mal-id}/{ep}/{sub\|dub}` | `https://megaplay.buzz/stream/mal/1535/1/dub` |

KittyAPI fetches the embed page → `getSources` → HLS. AniKitty calls **stream-direct** and plays the returned `file` URL in its own HLS player — no iframe.

---

## 2. KittyAPI — step-by-step

Replace `https://kittyapi.YOUR-NODE.sslip.io` with your node (e.g. `https://kittyapi.92-119-165-226.sslip.io`).

Every call requires:

```http
Authorization: Bearer YOUR_API_KEY
```

### Easiest: one-shot stream

```http
GET /provider/MegaPlay/stream-direct?anilistId=1535&episode=1&audio=sub
```

Full URL:

```
https://kittyapi.92-119-165-226.sslip.io/provider/MegaPlay/stream-direct?anilistId=1535&episode=1&audio=sub
```

For dub: `...&audio=dub`

### Full flow (search → episodes → servers → stream)

**1. Search**

```http
GET /provider/MegaPlay/search?q=death+note
```

**2. Episodes** — pick a `seriesUrl`:

| Type | `seriesUrl` value | When to use |
|------|-------------------|-------------|
| AniList | `anilist:1535` | Works everywhere; uses ani/mal embeds |
| Catalog | `catalog:8691` | Best quality — real s-2 embed IDs from Anikoto API |

```http
GET /provider/MegaPlay/episodes?seriesUrl=anilist:1535&audio=sub
```

**3. Servers** — pass `dataIds` from the episode object:

```http
GET /provider/MegaPlay/servers?dataIds={...json...}&audio=sub
```

**4. Stream** — pass `linkId` from a server:

```http
GET /provider/MegaPlay/stream?linkId={...json...}
```

---

## 3. Concrete example — Death Note ep 1

**AniList path (simple):**

```http
GET /provider/MegaPlay/stream-direct?anilistId=1535&episode=1&audio=sub
```

**Catalog path (multi-quality 1080p/720p/360p when available):**

```http
GET /provider/MegaPlay/episodes?seriesUrl=catalog:XXXX&audio=sub
```

Get `catalog:XXXX` from [Anikoto API](https://anikotoapi.site) `GET /series/{id}` — the **id in the anime object**, not the AniList ID. Example: Slime S4 → `catalog:8691`.

---

## 4. `seriesUrl` formats the provider accepts

```
anilist:1535      ← AniList ID (Death Note)
anilist:154587    ← Frieren
catalog:8691      ← Anikoto catalog ID (Slime S4 — has s-2 embeds)
8691              ← bare number = treated as catalog ID
```

---

## 5. What you get back from `/stream`

```json
{
  "file": "https://cdn.mewstream.buzz/anime/.../index-f1.m3u8",
  "headers": { "Referer": "https://megaplay.buzz/", "Origin": "https://megaplay.buzz" },
  "tracks": [{ "file": "...", "label": "English", "default": true }],
  "allServers": [
    { "quality": "1080p", "file": "..." },
    { "quality": "720p", "file": "..." }
  ]
}
```

Use `file` in your player with the `headers` included. If the response wraps it in `/proxy?url=...&token=...`, play that proxied URL instead (AniKitty rewrites this automatically in `/api/kitty/stream`).

---

## Site example

```js
const API = 'https://kittyapi.92-119-165-226.sslip.io';
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
| Quality | HLS manifest levels + `allServers` for explicit quality pickers (best via `catalog:{id}`) |
| Series ref | `anilist:{id}` on watch page; `catalog:{id}` for full multi-quality flow |
| Embed fallbacks | Handled server-side (s-2 → ani → mal) — no client retry needed |
| `file` URL | Signed/proxied — pass directly to the HLS player |

Code paths:

- `src/lib/kitty/kitty-stream-api.ts` — `fetchKittyStreamDirect()` → `/provider/MegaPlay/stream-direct`
- `src/app/api/kitty/stream/route.ts` — generic provider handler for MegaPlay
- `src/lib/kitty/megaplay-providers.ts` — embed routes, series ref helpers, legacy ID migration

---

## Full flow example

```js
async function api(path) {
  const res = await fetch(`${API}${path}`, { headers });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

const results = await api('/provider/MegaPlay/search?q=frieren');
const episodes = await api('/provider/MegaPlay/episodes?seriesUrl=catalog:8691&audio=sub');
const ep1 = episodes.find((e) => e.number === 1);
const servers = await api(
  `/provider/MegaPlay/servers?dataIds=${encodeURIComponent(ep1.dataIds)}&audio=sub`
);
const stream = await api(
  `/provider/MegaPlay/stream?linkId=${encodeURIComponent(servers[0].id)}`
);
video.src = stream.file;
// stream.allServers → 1080p, 720p, 360p when s-2 route succeeded
```

---

## Minimal test (curl)

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
  "https://kittyapi.92-119-165-226.sslip.io/provider/MegaPlay/stream-direct?anilistId=1535&episode=1&audio=sub"
```

Cluster node test:

```bash
node --env-file=.env.local scripts/test-megaplay-nodes.mjs
```

Requires `KITTY_API_KEY` in `.env.local`.

---

## Quick reference

| Topic | Detail |
|-------|--------|
| Series ref | `catalog:{id}` for multi-quality; `anilist:{id}` for stream-direct; bare number = catalog |
| Audio | `audio=sub` or `audio=dub` |
| Qualities | `allServers` array (1080p/720p/360p via s-2) |
| `backend` | Which embed route succeeded: `s2`, `ani`, or `mal` |
| Health check | `GET /health` (requires API key) |

For most sites, **stream-direct is enough**: AniList ID + episode → play URL with automatic fallbacks. Use the full `catalog:{id}` flow when you need explicit multi-quality server picking in the UI.
