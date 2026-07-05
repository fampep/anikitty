# MegaPlay-family providers (KittyAPI)

AniKitty streams through [KittyAPI](https://github.com/fampep/kittyapi). Five providers share the **MegaPlay** scrape/stream stack in KittyAPI; per-site differences live in `SITE_CONFIGS`.

| Provider | Site | Audio tracks | Hard-sub (`HS:`) | Soft subs (VTT) |
|----------|------|--------------|------------------|-----------------|
| **Anikoto** | anikototv.to (+ mirrors) | SUB · DUB | Yes | SUB responses |
| **AnimeSogo** | animesogo.to | SUB · DUB | Yes | SUB responses |
| **Anix** | anixtv.me | SUB · DUB | Yes | SUB responses |
| **HiAnime** | hianimez.org | SUB · DUB | Yes | SUB responses |
| **Animepahe** | animepahetv.to | SUB · DUB | Yes | SUB responses |

AniKitty mirrors this in `src/lib/kitty/megaplay-providers.ts` and surfaces it in the watch-page provider grid (SUB / DUB / HARDSUB rows).

---

## Audio types

| Track | KittyAPI `audio` param | AniKitty row | Notes |
|-------|------------------------|--------------|-------|
| **SUB** | `sub` | SUB | Japanese audio; soft VTT/ASS in `tracks[]` when embed exposes them |
| **DUB** | `dub` | DUB | English dub servers |
| **HSUB** | `sub` (HS server line) | HARDSUB | Burned-in subs via `HS: {server}` lines — not a separate API param |

MegaPlay sites expose `subGroups: ['sub', 'hsub']`. Hard-sub servers are labeled **`HS: VidPlay-1`**, **`HS: HD-1`**, etc.

---

## Known embed servers (by site)

### Anikoto
- **SUB / HSUB:** VidPlay-1, HD-1, Vidstream-2, VidCloud-1
- **DUB:** HD-1, Vidstream-2, VidCloud-1, VidPlay-1
- **Mirrors:** anikototv.to, anikoto.cz, anikoto.me, anikoto.net, anikototv.se

### AnimeSogo · HiAnime
- **SUB / DUB / HSUB:** VidPlay-1, HD-1, HD-2, HD-3, Vidstream-2, VidCloud-1

### Anix
- **SUB / DUB / HSUB:** VidPlay-1, HD-1, HD-2, Vidstream-2, VidCloud-1

### Animepahe
Separate provider class (not in `SITE_CONFIGS`), but uses MegaPlay embed hosts:
- **Megaplay** — `megaplay.buzz`
- **Vidplay** — `vidwish.live`
- Episodes keyed by manga slug + session MD5 (not AniList catalog mode)

---

## AniKitty integration

- **Provider metadata:** `src/lib/kitty/kitty-providers.ts` — `hardSub: true` for all five; hints from `MEGAPLAY_PROVIDER_CONFIG`
- **Native subs:** stream-direct `tracks[]` kept in the Vidstack player when `providerHasNativeSubs()` is true
- **Kitty `/subs`:** all five support `GET /subs?provider=…` (see [kitty-subs-endpoint.md](./kitty-subs-endpoint.md))
- **Episode probe:** `stream-capabilities.ts` probes SUB/DUB per episode; HARDSUB row shows providers where SUB works without soft tracks or metadata marks `hardSub`

---

## Related providers (not MegaPlay family)

**Animo**, **2Dhive**, **Anizen**, and others may use MegaPlay *embeds* but have separate KittyAPI provider classes. They are **not** in `MEGAPLAY_FAMILY_PROVIDERS`.
