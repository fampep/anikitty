# Lunar Provider

The **Lunar** provider streams from [lunaranime.ru](https://lunaranime.ru). The site is a Next.js app backed by `api.lunaranime.ru`, which requires **ES256 DPoP** proofs on every request. Episodes and per-episode mirrors come from the Vermillion API; stream URLs are XOR-encrypted in API responses and decrypted using SSR seed objects embedded in the watch page HTML.

| Mode | Support | Notes |
|------|---------|-------|
| **SUB** | Yes | `beep`, `mimi`, `vee`, `yuki`, `miku`, `neko`, `uwu`, … |
| **DUB** | Yes | Separate `dubProviders` list |

Series are identified by **slug** (e.g. `marriagetoxin`) or **AniList id** (e.g. `199547`).

---

## Quick start

```http
GET /provider/Lunar/stream-direct?anilistId=199547&episode=1&audio=sub
Authorization: Bearer YOUR_API_KEY
```

---

## Servers (AniKitty picker)

| Host | Label | Notes |
|------|-------|-------|
| **beep** | Beep | Default · PlayEng / Kwik · soft sub |
| **mimi** | Mimi | Hard-sub HLS · fastest |
| **yuki** | Yuki | MegaPlay · cluster proxy |
| **miku** | Miku | MegaCloud · cluster proxy |
| **vee** | Vee | Soft sub |
| **neko** | Neko | Hard-sub HLS |
| **uwu** | Uwu | Hard-sub HLS |
| **kami** | Kami | cluster.lunaranime.ru proxy |
| **sv-2** | FlixCloud | 3rd provider fallback |

---

## AniKitty integration

Registered in `src/lib/kitty/kitty-providers.ts` with a **Multi row** server picker:

- Servers resolve via `/provider/Lunar/servers` + `/stream` (host key in `linkId`)
- Default: **Beep**; falls back to `stream-direct`
- SUB/DUB toggled in the player

Requires KittyAPI `PROVIDER_CONFIG.Lunar = true` (disable with `DISABLED_PROVIDERS=Lunar`).

---

## Example: curl

```bash
curl -H "Authorization: Bearer $KEY" \
  "https://YOUR_HOST/provider/Lunar/stream-direct?anilistId=199547&episode=1&audio=sub"
```
