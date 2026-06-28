# AllAnime & MKissa Providers

The **AllAnime** and **MKissa** providers stream from [allmanga.to](https://allmanga.to) and [mkissa.to](https://mkissa.to). Both sites share the same backend: **`api.allanime.day`** GraphQL API and **`allanime.day`** player embeds.

Logic lives in `lib/allanime-api.js`; each provider is a thin wrapper with a different `Referer` / `Origin`.

| Provider | Site | Referer |
|----------|------|---------|
| **AllAnime** | allmanga.to | `https://allmanga.to/` |
| **MKissa** | mkissa.to | `https://mkissa.to/` |

Anikitty exposes both via KittyAPI on the watch page (`stream-direct` + live capability probes). Subtitle tracks can also be fetched through KittyAPI `/subs`.

---

## Servers (per episode)

Servers are **dynamic** — names come from the API per episode. Common sources:

### AllAnime (allmanga.to)

| Server | Backend | Notes |
|--------|---------|-------|
| **Default** | Wixstatic / clock API | Often direct `video.wixstatic.com` MP4 |
| **Ok** | ok.ru embed | MP4 via okcdn |
| **Mp4** | Third-party embed | mp4upload, etc. |
| **Sl-mp4** | Streamlare embed | |
| **Uv-mp4** | uns.bio / clock API | |
| **Luf-Mp4** | Wix repackager | `repackager.wixmp.com` |
| **Ss-Hls** | StreamSB HLS | |

### MKissa (mkissa.to)

| Server | Backend | Notes |
|--------|---------|-------|
| **Ok** | ok.ru embed | |
| **Uni** | uns.bio embed | |
| **Fm-Hls** | Filemoon HLS | |
| **Mp4** | mp4upload embed | |
| **Yt** | YouTube-style clock path | Legacy AllAnime CDN |
| **S-mp4** | Streamlare MP4 | |

Download-only mirror names (`Filemoon`, `Uns`, `StreamSB`, `Streamlare`) are skipped in the server list.

Sub and dub are selected with `translationType=sub` or `translationType=dub` on the episode API.

---

## Quick start

```http
GET /provider/AllAnime/stream-direct?anilistId=21&episode=1&audio=sub
Authorization: Bearer YOUR_API_KEY
```

**Typical flow:**

```http
GET /provider/AllAnime/search?q=one+piece
GET /provider/AllAnime/episodes?seriesUrl=al-...
GET /provider/AllAnime/servers?dataIds={"showId":"al-...","ep":"1","mode":"sub"}&audio=sub
GET /provider/AllAnime/stream?linkId={"showId":"al-...","ep":"1","mode":"sub","provider":"Default"}
```

Search returns `url` = AllAnime **show ID** (e.g. `al-...`). Use that as `seriesUrl` / `showId`.

MKissa uses the same flow with `/provider/MKissa/...` and `mk-...` show IDs.

---

## Subs-only endpoint

Both providers support **`GET /subs`** and **`GET /provider/{name}/subs`**.

Subtitles are extracted from stream metadata (HLS `EXT-X-MEDIA` tracks, embed pages, or URL query params) by trying servers until tracks are found.

```http
GET /subs?provider=AllAnime&anilistId=21&episode=1&audio=sub
Authorization: Bearer YOUR_API_KEY
```

```http
GET /subs?provider=MKissa&seriesUrl=mk-...&episode=1&audio=dub
Authorization: Bearer YOUR_API_KEY
```

See KittyAPI `SUBS_ENDPOINT.txt` for full `/subs` documentation.

---

## What changed (2025 refactor)

### Problem

Episode responses moved encrypted source lists into **`data.tobeparsed`** (AES-256-CTR, key derived from `Xot36i3lK3:v1`). Old code expected top-level `tobeparsed`, used wrong referers (`youtu-chan.com`), and hardcoded source names that no longer matched the API.

### Solution

Shared module `lib/allanime-api.js`:

1. **`fetchEpisodePayload`** — GET/POST `api.allanime.day` with correct site referer.
2. **`parseSourceLines`** — decrypt `tobeparsed`, parse `sourceUrls`, dedupe and rank sources.
3. **`extractEpisodeStreams`** — resolve each source:
   - **Direct URLs** (`stype: "o"`) → embed extraction (ok.ru, mp4upload, streamlare, etc.)
   - **Hex paths** (`--...`) → decode to `/apivtwo/clock.json?id=...` on `allanime.day`
   - **Wixstatic** URLs → quality fallback (1080p → 720p → …)
4. **`searchShows` / `listEpisodes`** — GraphQL search and episode listing.

Providers (`AllAnimeProvider.js`, `MKissaProvider.js`) only map BaseProvider methods to the shared API.

---

## Internal identifiers

### `dataIds` (episodes / servers)

```json
{ "showId": "al-...", "ep": "1", "mode": "sub" }
```

### `linkId` (stream)

```json
{ "showId": "al-...", "ep": "1", "mode": "sub", "provider": "Default" }
```

`provider` is the `sourceName` from the API (e.g. `Ok`, `Luf-Mp4`, `Fm-Hls`).

MKissa legacy fallback server uses `linkId` without `provider`; extraction tries all sources.

---

## API flow

```
allmanga.to / mkissa.to
        │
        ├─► Search
        │     POST api.allanime.day/api  (GraphQL searchShows)
        │     → show _id, englishName, name
        │
        ├─► Episodes
        │     POST api.allanime.day/api  (availableEpisodesDetail)
        │     → ["1", "2", ...] per translationType
        │
        ├─► Episode payload
        │     GET/POST api.allanime.day/api  (persisted episode query)
        │     → data.tobeparsed (encrypted) + optional sourceUrls
        │
        └─► Stream resolution
              ├─ direct embed URL → embed-extract (ok, mp4upload, …)
              ├─ --hex path → allanime.day/apivtwo/clock.json
              └─ wixstatic → progressive MP4 or repackager HLS
```

Player iframe: `https://allanime.day/player.html?id={showId}`

---

## Required headers

Stream responses include:

```json
{
  "headers": {
    "Referer": "https://allmanga.to/",
    "Origin": "https://allmanga.to"
  },
  "file": "https://...",
  "tracks": []
}
```

MKissa uses `https://mkissa.to/` referer instead.

---

## Testing

Probe script (KittyAPI local):

```bash
node scripts/probe-mkissa.mjs
```

Manual checks:

- **AllAnime** — One Piece ep 1 sub → `Default` → wixstatic MP4
- **MKissa** — NEEDY GIRL OVERDOSE ep 1 dub → `Ok` → okcdn MP4

---

## Files (KittyAPI)

| Path | Role |
|------|------|
| `lib/allanime-api.js` | Shared API, decrypt, stream extraction |
| `providers/AllAnimeProvider.js` | AllManga wrapper (`allMangaApi`) |
| `providers/MKissaProvider.js` | MKissa wrapper (`mkissaApi`) |
| `lib/provider-subtitles.js` | `/subs` provider list |
| `server.js` | `PROVIDER_SERVERS` display strings |

## Anikitty integration

| Path | Role |
|------|------|
| `src/lib/kitty-providers.ts` | Provider list + hints |
| `src/lib/kitty-subs-api.ts` | `/subs` fetch for AllAnime & MKissa |
| `src/lib/stream-capabilities.ts` | Per-episode sub/dub/hardsub probes via `stream-direct` |
| `src/app/api/kitty/stream/route.ts` | Generic `stream-direct` proxy for both providers |
