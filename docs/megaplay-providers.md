# MegaPlay provider (KittyAPI)

AniKitty streams through [KittyAPI](https://github.com/fampep/kittyapi). **MegaPlay** is a single provider — all former MegaPlay-family sites are internal backends, not separate API providers.

| Backend | Site | Role |
|---------|------|------|
| **Anikoto** | anikototv.to (+ mirrors) | Catalog via `anikotoapi.site` when `seriesUrl` is `anilist:{id}` |
| **AnimeSogo** | animesogo.to | Search + scrape when URL matches site |
| **Anix** | anixtv.me | Search + scrape when URL matches site |
| **HiAnime** | hianimez.org | Search + scrape when URL matches site |
| **Animepahe** | animepahetv.to | Search + scrape when URL matches site |

AniKitty surfaces one **MegaPlay** entry in the watch-page provider grid (SUB / DUB / HARDSUB rows). Saved `localStorage` values for the five legacy names map to `MegaPlay` via `normalizeKittyProvider()`.

---

## How KittyAPI routes requests

| Step | Behavior |
|------|----------|
| **Search** | Merges results from all five backends |
| **Episodes / servers / stream** | Routes by `seriesUrl` — `anilist:1535` → Anikoto API, `anixtv.me/...` → Anix, etc. |
| **Multi-quality** | 1080p / 720p / 360p via `allServers` in stream responses; HLS manifests expose tiers in the player |

### API (provider name: `MegaPlay` only)

```http
GET /provider/MegaPlay/search?q=death+note
GET /provider/MegaPlay/episodes?seriesUrl=anilist:1535
GET /provider/MegaPlay/servers?dataIds=...&audio=sub
GET /provider/MegaPlay/stream?linkId=...
GET /provider/MegaPlay/stream-direct?anilistId=1535&episode=1&audio=sub
```

---

## Audio types

| Track | KittyAPI `audio` param | AniKitty row | Notes |
|-------|------------------------|--------------|-------|
| **SUB** | `sub` | SUB | Japanese audio; soft VTT/ASS in `tracks[]` when embed exposes them |
| **DUB** | `dub` | DUB | English dub servers |
| **HSUB** | `sub` (HS server line) | HARDSUB | Burned-in subs via `HS: {server}` lines — not a separate API param |

Hard-sub servers are labeled **`HS: VidPlay-1`**, **`HS: HD-1`**, etc.

---

## Known embed servers

Typical MegaPlay embed lines across backends:

- **SUB / DUB / HSUB:** VidPlay-1, HD-1, HD-2, HD-3, Vidstream-2, VidCloud-1
- Streams resolve via `megaplay.buzz` (`/stream/ani/`, `/stream/s-2/`, `/stream/mal/` → `getSources`)

---

## AniKitty integration

- **Provider metadata:** `src/lib/kitty/megaplay-providers.ts`, `src/lib/kitty/kitty-providers.ts`
- **Default provider:** `MegaPlay` (first in `DEFAULT_PROVIDER_PRIORITY`)
- **Streams:** `fetchKittyStreamDirect()` → `GET /provider/MegaPlay/stream-direct?...`
- **Native subs:** stream-direct `tracks[]` kept in the player when `providerHasNativeSubs()` is true
- **Kitty `/subs`:** `GET /subs?provider=MegaPlay` (see [kitty-subs-endpoint.md](./kitty-subs-endpoint.md))
- **Quality picker:** HLS control plugin reads manifest levels (1080p / 720p / 360p) automatically

---

## Related providers (not MegaPlay)

**Animo**, **2Dhive**, **Anizen**, and others may use MegaPlay *embeds* but have separate KittyAPI provider classes. They are **not** backends behind `MegaPlay`.
