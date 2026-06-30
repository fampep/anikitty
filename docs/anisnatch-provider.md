# AniSnatch Provider

The **AniSnatch** provider streams from [anisnatch.top](https://anisnatch.top). The site is a JavaScript SPA with a **custom encrypted AJAX API** — search, episodes, and per-episode servers are fetched via POST requests that return gzip JSON hidden inside PNG responses. Streams resolve from AniSnatch’s `/video/` proxy pages or by decoding embedded source paths (VibePlayer, Kwik, AniBD, MegaPlay, etc.).

| Mode | Support | Notes |
|------|---------|-------|
| **SUB** | Yes | Hard subs — `AniVibe`, `Kwik`, `AniBD`, `OkCdn`, `MP4`, … |
| **DUB** | Yes | Separate server list (`Swift`, `AniCdn`, …) |
| **soft-sub** | Yes | Soft-sub track via `api/loadSVs` key `soft-sub` (pass `audio=soft-sub` if your client supports it) |

Series are identified by numeric **anime ID** (e.g. `53732`). Watch URLs look like `https://anisnatch.top/watch/53732?ep=1`.

AniKitty uses **stream-direct** only (`audio=sub` / `audio=dub`). Hard-sub SUB streams are baked into the video; use KittyAPI `audio=soft-sub` outside the watch UI if you need separate soft-sub tracks.

---

## Quick start

```http
GET /provider/AniSnatch/stream-direct?anilistId=158036&episode=1&audio=sub
Authorization: Bearer YOUR_API_KEY
```

**Eren the Southpaw** (AniSnatch id `53732`, AniList `158036`):

```http
GET /provider/AniSnatch/search?q=southpaw
GET /provider/AniSnatch/episodes?seriesUrl=53732&audio=sub
GET /provider/AniSnatch/servers?dataIds={"animeId":"53732","ep":1}&audio=sub
GET /provider/AniSnatch/stream?linkId={"animeId":"53732","ep":1,"audio":"sub","source":"vibeplayer/aHR0cHM6Ly92aXZpYmViZS5zaXRlL2U1NGE3MzViMjM0MjhkOWQ=/53732-1","server":"animedao-vibe-hd-1","name":"AniVibe"}
```

Search returns numeric anime IDs as `url`. Pass AniList ID to `episodes` / `stream-direct` and the provider resolves via AniList titles + `api/quickSearch`.

---

## Servers

Servers come from `api/loadSVs` grouped by audio type. Typical SUB servers (priority order):

| Label | Source type | Resolution path | Notes |
|-------|-------------|-----------------|-------|
| **AniVibe** | `vibeplayer` | Base64 → `vivibebe.site` → `extractM3u8Fast` | Fastest, most reliable |
| **NekoVibe** | `vibeplayer` | Same as AniVibe (bibiemb host) | Alternate Vibe embed |
| **Kwik** | `kwik` | Base64 JSON with `360`/`720`/`1080` kwik.cx URLs | Uses kwik resolver |
| **AniBD** | `anibd` | `fetchVideoSources` → PlayEng embed | Reuses `lib/anibd-api.js` |
| **AniYT** | `yt-mp4` | `/video/{source}-sub` proxy page | MP4 |
| **AniAra** | `aniara` | Video proxy page | |
| **OkCdn** | `ok` | Video proxy page | AllManga-style CDN |
| **MP4** | `mp4` | Video proxy page | Direct MP4 |
| **Megaplay** | `megaplay` | Video proxy page | |
| **Vidwish** | `vidwish` | Video proxy page | |
| **Onsen** | `onsen` | Video proxy page | |

**Prefer AniVibe** for production HLS. Fallback: `resolveFromVideoPage()` fetches `https://anisnatch.top/video/{source}-sub` and parses m3u8/mp4 from the AniPlayer HTML.

---

## Endpoints (AnikiKittyAPI)

Base: your API host (e.g. `https://kittyapi.92-119-165-226.sslip.io`).

| Step | Request |
|------|---------|
| Search | `GET /provider/AniSnatch/search?q=southpaw` |
| Episodes | `GET /provider/AniSnatch/episodes?seriesUrl=53732&audio=sub` |
| Servers | `GET /provider/AniSnatch/servers?dataIds=...&audio=sub` |
| Stream | `GET /provider/AniSnatch/stream?linkId=...` |
| Shortcut | `GET /provider/AniSnatch/stream-direct?anilistId=158036&episode=1&audio=sub` |

### Search response

```json
[
  {
    "title": "Eren the Southpaw",
    "url": "53732",
    "hasSub": true,
    "hasDub": false
  }
]
```

Only entries with `streamable: 1` are returned.

### Episode `dataIds`

```json
{
  "animeId": "53732",
  "ep": 1
}
```

- `animeId` — numeric AniSnatch show ID
- `ep` — episode number from `api/loadEPs`

### Server `linkId`

```json
{
  "animeId": "53732",
  "ep": 1,
  "audio": "sub",
  "source": "vibeplayer/aHR0cHM6Ly92aXZpYmViZS5zaXRlL2U1NGE3MzViMjM0MjhkOWQ=/53732-1",
  "server": "animedao-vibe-hd-1",
  "name": "AniVibe"
}
```

- `source` — opaque path from `loadSVs` (type/payload/animeId-ep)
- `server` — internal server key (e.g. `animedao-vibe-hd-1`)

### Stream response (AniVibe — HLS)

```json
{
  "file": "https://vivibebe.site/public/stream/e54a735b23428d9d/master.m3u8",
  "headers": {
    "Referer": "https://vivibebe.site/e54a735b23428d9d",
    "Origin": "https://vivibebe.site"
  }
}
```

Video-proxy responses may return a MegaUp-wrapped m3u8:

```
https://r.megaup.store/master/.../master.m3u8
```

Use the returned `headers` when proxying segments through AniKitty’s HLS proxy.

---

## AniKitty integration

Registered in `src/lib/kitty/kitty-providers.ts`:

- **Multi row** provider (with Miruro and Animex) — SUB/DUB toggled in the player via separate streams
- Generic stream path: `/api/kitty/stream?provider=AniSnatch&audio=sub|dub`
- **Hard sub** on SUB streams; soft-sub available on KittyAPI via `audio=soft-sub` (not exposed in the watch UI yet)

Requires KittyAPI `PROVIDER_CONFIG.AniSnatch = true` (disable with `DISABLED_PROVIDERS=AniSnatch`).

---

## Limitations

- **Encrypted API** — depends on vendored `ajax.min.js`; site updates may break crypto until the bundle is refreshed.
- **Clock skew** — token validation uses `serverTime`; large VPS clock drift can cause API failures.
- **AniVibe is the reliable HLS path** — MP4/OkCdn/Uni servers may be slower or geo-blocked.
- **DUB catalog differs** — `loadSVs` returns a separate `dub` array; not all shows have dub servers.
- **No dedicated `/subs` in AniKitty** — use `audio=soft-sub` on KittyAPI when the site exposes soft-sub servers.
- **Signed CDN URLs** — m3u8 and segment URLs expire; resolve fresh per request.

---

## Example: curl

```bash
# Search
curl -H "Authorization: Bearer $KEY" \
  "https://YOUR_HOST/provider/AniSnatch/search?q=southpaw"

# Episodes by AniSnatch id
curl -H "Authorization: Bearer $KEY" \
  "https://YOUR_HOST/provider/AniSnatch/episodes?seriesUrl=53732&audio=sub"

# Stream in one call (AniList id)
curl -H "Authorization: Bearer $KEY" \
  "https://YOUR_HOST/provider/AniSnatch/stream-direct?anilistId=158036&episode=1&audio=sub"
```
