<p align="center">
  <img src="apps/android/app/src/main/res/drawable/anikitty_logo.png" alt="AniKitty" width="160" />
</p>

<h1 align="center">AniKitty</h1>

<p align="center">
  <strong>Watch your favourite anime — anywhere, anytime. No ads.</strong>
</p>

<p align="center">
  <a href="https://github.com/fampep/anikitty/releases/tag/v1.1.2"><img src="https://img.shields.io/badge/Pre--release-1.1.2-orange?style=for-the-badge" alt="Pre-release 1.1.2" /></a>
  <a href="https://github.com/fampep/anikitty/stargazers"><img src="https://img.shields.io/github/stars/fampep/anikitty?style=for-the-badge&logo=github&logoColor=white&color=0ea5e9" alt="Stars" /></a>
  <a href="https://github.com/fampep/anikitty/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-PolyForm%20NC-0284c7?style=for-the-badge" alt="PolyForm Noncommercial" /></a>
</p>

<p align="center">
  <a href="https://t.me/Anikittymoe"><img src="https://img.shields.io/badge/Telegram-Anikittymoe-28A8E9?style=for-the-badge&logo=telegram&logoColor=white" alt="Telegram" /></a>
  <a href="https://github.com/fampep/anikitty/issues"><img src="https://img.shields.io/badge/Issues-welcome-0369a1?style=for-the-badge&logo=github&logoColor=white" alt="Issues" /></a>
  <a href="https://github.com/fampep/anikitty/releases/tag/v1.1.2"><img src="https://img.shields.io/badge/APK-download-0ea5e9?style=for-the-badge&logo=android&logoColor=white" alt="Download APK" /></a>
</p>

> [!WARNING]
> **Alpha.** AniKitty is early / unfinished software. Expect bugs, missing features, broken playback on some titles, and breaking changes. I’m actively working toward a more stable version over time. Builds ship as **rolling pre-releases** — each drop is for early testing, not a finished product. Latest: [**v1.1.2 pre-release**](https://github.com/fampep/anikitty/releases/tag/v1.1.2).

<br />

AniKitty is an **Android APK** + **Go dedicated auth server** + **BYO HTTP stream extensions**, with a glass dark on-phone UI.

1. Sign in with a **password account** on the dedicated auth server (AniList link optional for list sync)  
2. Browse AniList on-device (Home / Search / Library)  
3. Open the **Store** tab — search curated listings, install from GitHub, or keep bundled **Anikoto**  
4. The active extension resolves a playable URL; **Media3** streams on-device (**Chromecast** when Play Services is available)  

| | |
|---|---|
| Latest APK | [v1.1.2](https://github.com/fampep/anikitty/releases/tag/v1.1.2) |
| Author guide | [`extensions/GUIDE.md`](extensions/GUIDE.md) |
| Protocol | [`extensions/spec/PROTOCOL.md`](extensions/spec/PROTOCOL.md) |
| Submit to store | [`extensions/store/SUBMIT.md`](extensions/store/SUBMIT.md) |
| Extension home | [`extensions/README.md`](extensions/README.md) |

---

## What’s new in 1.1.x

| Version | Highlights |
|---|---|
| **1.1.2** | Dedicated **Store** tab (search / install / submit); **`iconUrl` required** — scraped-site brand icon; icons in Store + Account for listings and bundled Anikoto |
| **1.1.1** | Glass dark on-phone UI; PolyForm Noncommercial ownership license |
| **1.1.0** | BYO HTTP extension architecture (`apiVersion` 1), GitHub install, store feed index |

---

## Extension Store

The **Store** bottom-nav tab is the main place to discover and install resolvers:

- Search the curated index ([`extensions/store/index.json`](extensions/store/index.json))
- Install from a GitHub repo / raw manifest URL
- **Use** / **Selected** for the bundled Anikoto source (site icon shown)
- **Submit** opens the [Extension store submission](.github/ISSUE_TEMPLATE/extension_submit.yml) issue form

**Site icons are required.** Every extension manifest must include `iconUrl` — an HTTPS favicon/brand icon for the site you scrape or front. The Store and Account lists show that icon next to the name (Anikoto uses the anikoto.cz favicon).

```json
{
  "apiVersion": 1,
  "id": "com.example.source",
  "name": "Example",
  "version": "1.0.0",
  "baseUrl": "https://your-resolver.example.com",
  "iconUrl": "https://www.google.com/s2/favicons?domain=watch.example.com&sz=128",
  "siteUrl": "https://watch.example.com"
}
```

Extensions are HTTP resolve services, not dex plugins. Auth stays on the dedicated server; resolvers never receive account passwords. Community backends stay owned by their authors — see [`extensions/DISCLAIMER.md`](extensions/DISCLAIMER.md).

---

## Repo layout

| Path | What |
|---|---|
| `apps/android/` | Kotlin / Jetpack Compose APK (glass UI, Media3, Store) |
| `apps/dedicated-server/` | Go auth + favorites / comments / history API |
| `extensions/` | Manifest spec, author guide, store index, examples |
| `docs/public-github-setup.md` | How to publish the public `anikitty-extensions` repo |

---

## Android APK

```bash
cd apps/android
./gradlew :app:assembleRelease
# app/build/outputs/apk/release/app-release.apk
```

Current release build: **`versionName` 1.1.2** / `versionCode` 16.

Optional AniList OAuth client id (public, not a secret):

```bash
# local.properties or env
anilistClientId=YOUR_ID
# or: export ANILIST_CLIENT_ID=YOUR_ID
```

Register redirect URI `anikitty://anilist` on the AniList API client. You can also paste an access token in the app.

Default dedicated server URL is locked in `ServerConfig.DEFAULT` (VPS). Release cleartext is permitted only for that host.

---

## Dedicated server

```bash
cd apps/dedicated-server
export JWT_SECRET="$(openssl rand -base64 48)"
go run ./cmd/server   # :8788
```

See `apps/dedicated-server/README.md`.

---

## Releases

Rolling alpha pre-releases: https://github.com/fampep/anikitty/releases

| Tag | Notes |
|---|---|
| [v1.1.2](https://github.com/fampep/anikitty/releases/tag/v1.1.2) | Extension Store + site icons |
| [v1.1.1](https://github.com/fampep/anikitty/releases/tag/v1.1.1) | Glass UI + PolyForm NC |
| [v1.1.0](https://github.com/fampep/anikitty/releases/tag/v1.1.0) | Extension architecture |

---

## License & ownership

**Owned by fampep.** Licensed under the [PolyForm Noncommercial License 1.0.0](LICENSE) — educational / personal / noncommercial use. Not MIT.

Community stream extensions are gladly contributed by others; fampep does not own or control third-party extension backends. See [`extensions/DISCLAIMER.md`](extensions/DISCLAIMER.md).
