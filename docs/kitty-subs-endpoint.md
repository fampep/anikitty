# KittyAPI — Subs-only endpoint

This endpoint returns subtitle files only (VTT/ASS/SRT). It does **not** return video streams.

Supported providers: any **active** provider that exposes episode servers and stream extraction. The list is dynamic — query it at runtime:

```http
GET /subs?list=providers
Authorization: Bearer YOUR_API_KEY
```

Examples (when enabled in your deployment):

- MegaPlay family: Anikoto, AnimeSogo, Anix, HiAnime, Animepahe
- PimpAnime (native CDN, VTT on SUB)
- Animetsu, Animex, AllAnime, MKissa
- AnimeOnsen (ASS subtitles via OAuth API)
- AnimeNexus (multi-language ASS from stream API)
- AniWaves, Anizen, Senshi, Miruro, Animeya, and other server-based providers

Subtitles are resolved via provider-native subtitle APIs when available, then fallback server extraction with the same track enrichment used by `/stream` (HLS `EXT-X-MEDIA`, embed pages, m3u8 sidecars).

---

## Authentication

Every request requires an API key in the Authorization header:

```http
Authorization: Bearer YOUR_API_KEY
```

Do **not** pass the key as `?key=` in the URL.

---

## Endpoint

```http
GET /subs
```

List supported providers:

```http
GET /subs?list=providers
```

Alternative (same response format):

```http
GET /provider/{ProviderName}/subs
```

---

## Required parameters

| Param | Notes |
|-------|--------|
| `provider` | Provider name (see `GET /subs?list=providers`) |
| `anilistId` | AniList anime ID — provide this **or** `seriesUrl` |
| `seriesUrl` | Full watch-page URL on the provider site |

---

## Optional parameters

| Param | Notes |
|-------|--------|
| `episode` | Episode number. If omitted, subs are fetched for **all** episodes. |
| `audio` | `sub` (default) or `dub` — filters episodes and server groups |
| `title` | Helps AniList title matching when using `anilistId` |

---

## Examples

```http
GET /subs?provider=Anix&anilistId=177634&episode=13
GET /subs?provider=HiAnime&anilistId=123456
GET /subs?provider=AnimeSogo&seriesUrl=https://animesogo.to/watch/example-slug&episode=1
GET /subs?provider=Anix&anilistId=177634&episode=1&audio=dub
GET /subs?provider=Anikoto&anilistId=1535&episode=1&title=Death+Note
GET /subs?provider=AnimeOnsen&anilistId=1535&episode=1&title=Death+Note
GET /subs?provider=AnimeNexus&anilistId=108511&episode=1&title=That+Time+I+Got+Reincarnated+as+a+Slime+Season+4
GET /subs?list=providers
```

---

## Response format

```json
{
  "provider": "HiAnime",
  "anilistId": 123456,
  "title": "Anime Title",
  "seriesUrl": "https://hianimez.org/watch/...",
  "audio": "sub",
  "subtitles": [
    {
      "episode": 1,
      "files": [
        {
          "url": "https://your-api-host.com/proxy?token=...",
          "label": "English",
          "language": "en",
          "format": "vtt",
          "default": true
        }
      ]
    }
  ],
  "totalEpisodes": 1,
  "totalFiles": 1
}
```

---

## Anikitty integration

| Path | Role |
|------|------|
| `src/lib/kitty-subs-api.ts` | `/subs` fetch, dynamic provider list, fallback order |
| `src/lib/subtitle-cache-store.ts` | Cache tracks in Postgres; stored as `KittySubs` |
| `src/components/anime-subtitles.tsx` | Anime detail subtitle tab |
| `src/app/subtitles/page.tsx` | Public subtitle library |
| `src/app/api/anime/[id]/subtitles/route.ts` | Fetch + list cached tracks |

User-facing copy uses **Anikitty proxy** — not upstream provider names. KittyAPI tries providers from `GET /subs?list=providers` (merged with a static fallback list) until tracks are found.
