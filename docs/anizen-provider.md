# Anizen Provider

The **Anizen** provider streams from the Anizen catalog. Search, episode lists, and per-episode servers are resolved via the Anizen API; streams are extracted from third-party embed hosts (primarily **MegaPlay**, plus Ryzex/Abyss and generic WebView mirrors).

| Mode | Support | Notes |
|------|---------|-------|
| **SUB** | Yes | Servers tagged `sub` |
| **DUB** | Yes | Servers tagged `dub` |
| **Hindi** | Yes | Separate `HINDI` audio type on Kitty (`audio=hindi`) |

`loadSubtitles: true` — soft subs from MegaPlay `getSources` `tracks[]` (VTT) when available.

---

## Quick start

```http
GET /provider/Anizen/stream-direct?anilistId=20&episode=1&audio=sub
Authorization: Bearer YOUR_API_KEY
```

```http
GET /provider/Anizen/search?q=naruto
GET /provider/Anizen/episodes?seriesUrl=https://anizen.site/watch/{slug}
GET /provider/Anizen/servers?dataIds={"dataId":"...","epNum":1}&audio=sub
GET /provider/Anizen/stream?linkId={"embed":"...","serverName":"...","pageUrl":"..."}
```

Pass AniList ID to `episodes` / `stream-direct` and the provider resolves via AniList titles + search.

---

## Embed hosts

| Host | Extraction | Subtitles |
|------|------------|-----------|
| **MegaPlay** / **MegaCloud** / **VidWish** / **VidCloud** | `getSources?id=` API | VTT in `tracks[]` on SUB |
| **Ryzex** / **Abyss** / **PlayHydrax** | Encrypted `datas` + dec-abyss | From stream URL when present |
| **PlayerP2P** / **GDMirror** / **BoosterX** / **VidPlay** / **VidSrc** | WebView / browser extract | From embed when present |
| **Generic** | HTTP then browser fallback | Merged from embed + stream |

Server priority favors MegaPlay/VidStream, then VidWish/VidCloud, then Ryzex/Abyss.

---

## Subtitles (`/subs`)

Anizen supports Kitty `GET /subs`:

```http
GET /subs?provider=Anizen&anilistId=20&episode=1&audio=sub
Authorization: Bearer YOUR_API_KEY
```

Walks servers in priority order and merges VTT/ASS/SRT tracks from stream extraction.

---

## Main page

Anizen exposes curated browse routes:

| Key | Label |
|-----|-------|
| `home` | Home |
| `az-page/all` | A-Z Anime |
| `search?keyword=one%20piece` | Popular |
| `search?keyword=hindi` | Hindi |
| `search?keyword=dub` | Dubbed |

```http
GET /provider/Anizen/mainPage?request=home&page=1
```

---

## Supported types

- TV (`Anime`)
- Movies (`AnimeMovie`)

---

## Anikitty integration

- Listed in the watch provider grid (SUB / DUB rows).
- Native soft subs preserved in the player when MegaPlay returns `tracks[]`.
- Included in Kitty `/subs` fallback order and subtitle library bulk fetch.
