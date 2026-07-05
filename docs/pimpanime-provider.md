# PimpAnime Provider

The **PimpAnime** provider streams from [pimpanime.nl](https://pimpanime.nl). It exposes only the site’s **native CDN** (`pimpanime.b-cdn.net`) — signed `master.m3u8` URLs embedded in each episode page. Third-party mirrors on the site (MegaPlay, ReAnime, Kyren, vidnest, etc.) are **not** included; use other providers for those.

| Mode | Support | Notes |
|------|---------|-------|
| **SUB** | Yes | `lang=sub` on episode page |
| **DUB** | Yes | `lang=dub` when a dub CDN source exists |

Each episode returns **one server** named **PimpAnime**.

---

## Quick start

```http
GET /provider/PimpAnime/stream-direct?title=I+Want+to+End+this+Love+Game&episode=1&audio=sub
Authorization: Bearer YOUR_API_KEY
```

**I Want to End this Love Game** (series `8769`, episode 1 → episode id `31648`):

```http
GET /provider/PimpAnime/search?q=I+Want+to+End+this+Love+Game
GET /provider/PimpAnime/episodes?seriesUrl=https://pimpanime.nl/watch.php?id=8769&audio=sub
GET /provider/PimpAnime/servers?dataIds={"seriesId":"8769","episodeId":"31648","number":1}&audio=sub
GET /provider/PimpAnime/stream?linkId={"seriesId":"8769","episodeId":"31648","lang":"sub","audio":"sub"}
```

Site watch URL (reference):

```text
https://pimpanime.nl/episode.php?series=8769&episode=31648&lang=sub
```

---

## Servers

| Provider label | Site source | Output |
|----------------|-------------|--------|
| **PimpAnime** | `sourceGroups.sub/dub` entry with `server: "pimpanime"` | `https://pimpanime.b-cdn.net/.../master.m3u8?token=...` |

The episode HTML contains a `sourceGroups` JSON blob. The provider picks the non-lazy entry where `server === "pimpanime"` and uses its `url` directly. Subtitle tracks come from the same object’s `subtitles[]` array (VTT on the CDN).

**Not exposed** (available on the site but handled by other providers): Server 1 (MegaPlay), Server 2 (ReAnime / FlixCloud), Server 3 (Kyren), Server 4 (vidnest).

---

## Subtitles (`/subs`)

PimpAnime is included in `GET /subs?list=providers`. Soft subtitles are returned on **SUB** requests from the CDN VTT URLs in `sourceGroups`. **DUB** returns empty `tracks[]`.

```http
GET /subs?provider=PimpAnime&title=I+Want+to+End+this+Love+Game&episode=1&audio=sub
Authorization: Bearer YOUR_API_KEY
```

---

## Endpoints (KittyAPI)

Base: your API host (e.g. `https://kittyapi.example.com`).

| Step | Request |
|------|---------|
| Search | `GET /provider/PimpAnime/search?q=love+game` |
| Episodes | `GET /provider/PimpAnime/episodes?seriesUrl=8769&audio=sub` |
| Servers | `GET /provider/PimpAnime/servers?dataIds=...&audio=sub` |
| Stream | `GET /provider/PimpAnime/stream?linkId=...` |
| Subs only | `GET /subs?provider=PimpAnime&title=...&episode=1&audio=sub` |
| Shortcut | `GET /provider/PimpAnime/stream-direct?title=...&episode=1&audio=sub` |

### Search response

```json
[
  {
    "title": "I Want to End this Love Game",
    "url": "https://pimpanime.nl/watch.php?id=8769",
    "seriesId": "8769",
    "hasSub": true,
    "hasDub": true
  }
]
```

Search uses `search.php?mode=modern&q=...` and returns `watch.php?id={seriesId}` links. Pass `seriesUrl` as the full watch URL or just the numeric **series id** (`8769`).

### Episode `dataIds`

```json
{
  "seriesId": "8769",
  "episodeId": "31648",
  "number": 1
}
```

- **seriesId** — internal PimpAnime series id (`watch.php?id=`)
- **episodeId** — internal episode id (`episode.php?episode=`), not the display episode number
- **number** — human episode number (1, 2, 3, …)

Episodes are scraped from `watch.php?id={seriesId}`.

### Server `linkId`

```json
{
  "seriesId": "8769",
  "episodeId": "31648",
  "lang": "sub",
  "audio": "sub"
}
```

### Stream response

```json
{
  "file": "https://pimpanime.b-cdn.net/.../master.m3u8?token=...&expires=...",
  "headers": {
    "Referer": "https://pimpanime.nl",
    "Origin": "https://pimpanime.nl"
  },
  "tracks": [
    {
      "file": "https://pimpanime.b-cdn.net/.../subs/eng.vtt?token=...",
      "label": "English",
      "kind": "subtitles",
      "default": false
    }
  ],
  "allServers": [
    {
      "file": "https://pimpanime.b-cdn.net/.../master.m3u8?token=...",
      "quality": "PimpAnime",
      "headers": { "Referer": "https://pimpanime.nl", "Origin": "https://pimpanime.nl" }
    }
  ]
}
```

Stream URLs are **token-signed** and expire (`expires` query param). Do not cache `file` URLs long-term; re-fetch servers/stream on playback.

---

## Site flow (scraping)

```
search.php?mode=modern&q=...
        │
        ▼
watch.php?id={seriesId}          ← episode list (episodeId per row)
        │
        ▼
episode.php?series=&episode=&lang=sub|dub
        │
        ▼
sourceGroups = { sub: [...], dub: [...] }
        │
        ▼
pick server === "pimpanime"  →  master.m3u8 + subtitles[]
```

No Cloudflare bypass or browser automation is required for PimpAnime (unlike AniDB). Plain HTTP fetch with a browser User-Agent is sufficient.

---

## AniKitty integration

- Listed in the watch-page provider grid as **PimpAnime** (`src/lib/kitty/kitty-providers.ts`).
- Uses `stream-direct` with anime **title** + episode number (AniList id optional; title matching via search).
- Native CDN VTT tracks are kept in the player when this provider is selected.

---

## Limitations

- **Series ids are site-specific** — not AniList/MAL ids. Use `search` or pass `watch.php?id=` URLs.
- **Episode ids ≠ episode numbers** — always use `dataIds` from `episodes`; do not guess `episodeId` from episode number.
- **Signed URLs expire** — refresh before playback if cached.
- **Single server only** — mirrors on pimpanime.nl are intentionally omitted.
