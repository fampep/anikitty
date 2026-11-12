<p align="center">
  <img src="apps/android/app/src/main/res/drawable/anikitty_logo.png" alt="AniKitty" width="160" />
</p>

<h1 align="center">AniKitty</h1>

<p align="center">
  <strong>Watch your favourite anime — anywhere, anytime. No ads.</strong>
</p>

<p align="center">
  <a href="https://github.com/fampep/anikitty/releases/tag/v1.0.3"><img src="https://img.shields.io/badge/Pre--release-1.0.3-orange?style=for-the-badge" alt="Pre-release 1.0.3" /></a>
  <a href="https://github.com/fampep/anikitty/stargazers"><img src="https://img.shields.io/github/stars/fampep/anikitty?style=for-the-badge&logo=github&logoColor=white&color=0ea5e9" alt="Stars" /></a>
  <a href="https://github.com/fampep/anikitty/blob/main/LICENSE"><img src="https://img.shields.io/github/license/fampep/anikitty?style=for-the-badge&color=0284c7" alt="License" /></a>
</p>

<p align="center">
  <a href="https://t.me/Anikittymoe"><img src="https://img.shields.io/badge/Telegram-Anikittymoe-28A8E9?style=for-the-badge&logo=telegram&logoColor=white" alt="Telegram" /></a>
  <a href="https://github.com/fampep/anikitty/issues"><img src="https://img.shields.io/badge/Issues-welcome-0369a1?style=for-the-badge&logo=github&logoColor=white" alt="Issues" /></a>
</p>

> [!WARNING]
> **Alpha.** AniKitty is early / unfinished software. Expect bugs, missing features, broken playback on some titles, and breaking changes. I’m actively working toward a more stable version over time. Builds ship as **rolling pre-releases on a scheduled basis** — each drop is for early testing, not a finished product. Latest: [**v1.0.3 pre-release**](https://github.com/fampep/anikitty/releases/tag/v1.0.3).

<br />

AniKitty is an **Android APK** + **Go dedicated auth server**.

1. Sign in with **AniList** (list + progress sync) and/or a **password account** on your server  
2. Browse AniList on-device  
3. Pick a built-in **watch server** (e.g. Anikoto) — no third-party extension installs  
4. The phone resolves a playable URL; Media3 streams on-device (with **Chromecast** when Play Services is available)  

---

## Repo layout

| Path | What |
|---|---|
| `apps/android/` | Kotlin / Jetpack Compose APK |
| `apps/dedicated-server/` | Go auth + favorites / comments / history API |

---

## Android APK

```bash
cd apps/android
./gradlew :app:assembleRelease
# app/build/outputs/apk/release/app-release.apk
```

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

---

## License

See [LICENSE](LICENSE).
