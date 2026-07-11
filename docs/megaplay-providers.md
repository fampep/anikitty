# MegaPlay provider (KittyAPI)

AniKitty streams through [KittyAPI](https://github.com/fampep/kittyapi). **MegaPlay** is the single unified provider — do not call legacy names (Anikoto, HiAnime, AnimeSogo, etc.).

Every call requires:

```http
Authorization: Bearer YOUR_API_KEY
```

Keep the API key on your backend only (`KITTY_API_KEY` in `.env.local`).

---

## What changed

| Before (broken) | Now (correct) |
|-----------------|---------------|
| Separate providers (Anikoto, HiAnime, …) | One provider: **MegaPlay** |
| Catalog-only or embed-only paths | AniList ID + catalog lookup under the hood |
| Picking first search hit | Use AniList ID from your DB |
| Rebuilding stream URLs yourself | Pass `dataIds` / `linkId` unchanged |

**Rule:** AniKitty already stores AniList IDs — use those everywhere. Don't rely on search alone for popular shows.

---

## AniKitty integration (watch page)

AniKitty uses the **stream-direct shortcut** because every anime page has an AniList ID:

```
GET /api/kitty/stream?provider=MegaPlay&anilistId=21&episode=1&audio=sub&title=One%20Piece
  → KittyAPI GET /provider/MegaPlay/stream-direct?anilistId=21&episode=1&audio=sub&title=One%20Piece
```

| Topic | Detail |
|-------|--------|
| Provider | `MegaPlay` (default) — legacy saved names map to MegaPlay |
| Playback | `stream-direct` only — no `/auto/stream` fallback for MegaPlay |
| Title | Anime name passed as `title` to help catalog lookup |
| Quality | `allServers` quality picker when KittyAPI returns 1080p/720p/360p |
| Subtitles | `tracks[]` from stream + `/subs` with `seriesUrl=anilist:{id}` |
| Episodes UI | AniList episode list (not MegaPlay `/episodes`) — counts from Anikoto cache |

Code paths:

- `src/lib/kitty/megaplay-api.ts` — KittyAPI path builders + fetch helpers
- `src/lib/kitty/kitty-stream-api.ts` — `fetchKittyStreamDirect()` → stream-direct
- `src/app/api/kitty/stream/route.ts` — watch page proxy
- `src/lib/kitty/megaplay-providers.ts` — provider ID + legacy migration

---

## Full KittyAPI flow (reference)

Use when you don't have stream-direct or need explicit quality/server steps:

```
GET /provider/MegaPlay/episodes?seriesUrl=anilist:21
GET /provider/MegaPlay/servers?dataIds={ep.dataIds}&audio=sub
GET /provider/MegaPlay/stream?linkId={server.id}
```

Or one-call:

```
GET /provider/MegaPlay/stream-direct?anilistId=21&episode=1&audio=sub&title=One%20Piece
```

### Episodes

```http
GET /provider/MegaPlay/episodes?seriesUrl=anilist:21
GET /provider/MegaPlay/episodes?seriesUrl=anilist:21&audio=sub
```

Store `number`, `hasSub`, `hasDub`, and `dataIds` as-is.

### Servers

```http
GET /provider/MegaPlay/servers?dataIds=<URL-encoded dataIds>&audio=sub
```

### Stream

```http
GET /provider/MegaPlay/stream?linkId=<URL-encoded server.id>
```

Response includes `file`, `headers`, `tracks`, `allServers`.

### Search (only when you lack AniList ID)

```http
GET /provider/MegaPlay/search?q=one+piece
```

Results include `url: "anilist:21"` or `catalog:1642`. Prefer matching to your DB AniList ID.

---

## Important don'ts

- Don't build megaplay.buzz URLs yourself — KittyAPI picks ani / mal / s-2.
- Don't parse or rewrite `dataIds` / `linkId` JSON — pass back unchanged.
- Don't use `catalog:{id}` unless from search and you have no AniList ID.
- Don't call old provider names — use **MegaPlay** only.

---

## curl test

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
  "https://kittyapi.92-119-165-226.sslip.io/provider/MegaPlay/stream-direct?anilistId=1535&episode=1&audio=sub"

node --env-file=.env.local scripts/test-megaplay-nodes.mjs
```
