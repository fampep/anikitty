# AniWatch Provider

The **AniWatch** provider streams from [aniwatch.one](https://aniwatch.one). The site uses HiAnime-style **server-rendered watch pages**: search, the full episode list, and per-episode embed servers are scraped from HTML. Streams resolve from third-party embed hosts (primarily **MegaCloud**).

| Mode | Support | Notes |
|------|---------|-------|
| **SUB** | Yes | Servers `MGCLD`, `BYFMS`, `DGHG` on `data-type="sub"` |
| **DUB** | Yes | Same server labels on `data-type="dub"` |

SUB and DUB share one series URL (`/watch/{slug}`); pick `audio=sub` or `audio=dub` when listing servers and streaming.

---

## Quick start

```http
GET /provider/AniWatch/stream-direct?anilistId=20&episode=1&audio=sub
Authorization: Bearer YOUR_API_KEY
```

**Naruto Shippuden** (example slug `naruto-shippuden-355`):

```http
GET /provider/AniWatch/search?q=naruto+shippuden
GET /provider/AniWatch/episodes?seriesUrl=https://aniwatch.one/watch/naruto-shippuden-355&audio=sub
GET /provider/AniWatch/servers?dataIds={"seriesUrl":"https://aniwatch.one/watch/naruto-shippuden-355","seriesId":"355","slug":"naruto-shippuden-355","epNum":1,"episodeId":"8066"}&audio=sub
GET /provider/AniWatch/stream?linkId={"embedUrl":"https://megacloudx.net/embed-2/...","audio":"sub","epNum":1,"serverName":"MGCLD","seriesUrl":"https://aniwatch.one/watch/naruto-shippuden-355"}
```

Search returns full watch URLs. Pass AniList ID to `episodes` / `stream-direct` and the provider resolves via AniList titles + search.

---

## Servers

Each episode watch page lists `.server-item` elements with `data-type` (`sub` / `dub`), `data-url` (embed iframe URL), and a label:

| Label | Embed host | Server-side extraction | Subtitles |
|-------|------------|------------------------|-----------|
| **MGCLD** | `megacloudx.net` | Reliable ÔÇö `master.m3u8` in embed page | Soft subs when present in embed |
| **BYFMS** | `weneverbeenfree.com` | Often fails without browser | Unreliable |
| **DGHG** | `playmogo.com` | Often fails without browser | Unreliable |

**Prefer `MGCLD`** for production use. The provider sorts servers in that order. `extractEmbedStream()` uses a fast HTTP path for MegaCloud; other hosts may trigger Puppeteer (`useBrowser: true`) and still fail from datacenter IPs.

---

## Subtitles (`/subs`)

AniWatch implements `findSubtitles()` ÔÇö it walks servers in order, resolves the embed, and returns merged VTT/ASS/SRT tracks from `enrichStreamSubtitles()`.

```http
GET /subs?provider=AniWatch&anilistId=20&episode=1&audio=sub
Authorization: Bearer YOUR_API_KEY
```

- `audio=sub` ÔÇö tries each SUB server until tracks are found
- `audio=dub` ÔÇö returns empty (no separate soft subs on dub track)

For best results use **MGCLD**; mirrors that fail stream extraction will also fail `/subs`.

---

## Endpoints (AnikiKittyAPI)

Base: `https://anikiittyapi.buzz` (replace with your host).

| Step | Request |
|------|---------|
| Search | `GET /provider/AniWatch/search?q=naruto+shippuden` |
| Episodes | `GET /provider/AniWatch/episodes?seriesUrl=20&audio=sub` |
| Servers | `GET /provider/AniWatch/servers?dataIds=...&audio=sub` |
| Stream | `GET /provider/AniWatch/stream?linkId=...` |
| Subs only | `GET /subs?provider=AniWatch&anilistId=20&episode=1&audio=sub` |
| Shortcut | `GET /provider/AniWatch/stream-direct?anilistId=20&episode=1&audio=sub` |

### Search response

```json
[
  {
    "title": "Naruto: Shippuden",
    "url": "https://aniwatch.one/watch/naruto-shippuden-355",
    "hasSub": true,
    "hasDub": true
  }
]
```

### Episode `dataIds`

```json
{
  "seriesUrl": "https://aniwatch.one/watch/naruto-shippuden-355",
  "seriesId": "355",
  "slug": "naruto-shippuden-355",
  "epNum": 1,
  "episodeId": "8066"
}
```

- `seriesUrl` ÔÇö canonical watch URL (no `/episode/N` suffix)
- `seriesId` ÔÇö from `#wrapper[data-id]` on the watch page
- `slug` ÔÇö path segment after `/watch/`
- `epNum` ÔÇö display episode number (`data-number` on `a.ep-item`)
- `episodeId` ÔÇö internal episode ID (`data-id` on `a.ep-item`)

The full episode list is present in the **first episodeÔÇÖs SSR HTML** (e.g. 500 episodes for Naruto Shippuden, 1168 for One Piece). No paginated AJAX is required.

### Server `linkId`

```json
{
  "embedUrl": "https://megacloudx.net/embed-2/v2/e-1/...",
  "audio": "sub",
  "epNum": 1,
  "serverName": "MGCLD",
  "seriesUrl": "https://aniwatch.one/watch/naruto-shippuden-355"
}
```

### Stream response (MGCLD ÔÇö HLS)

```json
{
  "file": "https://.../master.m3u8",
  "headers": {
    "Referer": "https://aniwatch.one/",
    "Origin": "https://megacloudx.net"
  },
  "tracks": [
    {
      "file": "https://.../sub.vtt",
      "label": "English",
      "kind": "subtitles",
      "default": true
    }
  ],
  "allServers": [
    {
      "file": "https://.../master.m3u8",
      "quality": "MGCLD",
      "headers": { "Referer": "https://aniwatch.one/", "Origin": "https://megacloudx.net" }
    }
  ]
}
```

---

## Limitations

- **MGCLD only is reliable** ÔÇö BYFMS and DGHG frequently fail server-side; use MGCLD first.
- **Embed hosts change** ÔÇö `data-url` domains (`megacloudx.net`, etc.) may rotate; extraction depends on `embed-extract.js`.
- **No separate SUB/DUB series URLs** ÔÇö same slug; always pass `audio=` to `/servers` and `/stream`.
- **DUB has no soft subs** ÔÇö `findSubtitles()` returns empty for `audio=dub`.
- **Signed CDN URLs** ÔÇö m3u8 and segment URLs expire; resolve fresh per request.
- **Datacenter IP blocks** ÔÇö some embed CDNs block VPS IPs even when MegaCloud HTML parses; proxy referers are set in `proxy-core.cjs`.

---

## AniKitty integration

On the watch page, **AniWatch** appears in the featured provider row with SUB/DUB support. Streams use KittyAPI `stream-direct`; soft subtitles use embed tracks and `/subs?provider=AniWatch`.
