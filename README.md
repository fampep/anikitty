<div align="center">
  <img src="docs/brand/anikitty-icon-512.png" alt="AniKitty" width="96" height="96">

  <h1>AniKitty</h1>

  <p><strong>Your AniList, on the phone.</strong><br>
  Catalog and sign-in from AniList. Playback on the device. Progress stays with you.</p>

  <p>
    <a href="https://github.com/fampep/anikitty/releases/latest"><img src="https://img.shields.io/github/v/release/fampep/anikitty?display_name=tag&style=for-the-badge&label=stable&labelColor=0a0a0a&color=f5f5f5" alt="Latest stable release"></a>
    <a href="https://github.com/fampep/anikitty/releases"><img src="https://img.shields.io/github/v/release/fampep/anikitty?include_prereleases&filter=v1.*&display_name=tag&style=for-the-badge&label=dev&labelColor=0a0a0a&color=f5f5f5" alt="Latest dev prerelease"></a>
    <a href="https://github.com/fampep/anikitty/releases"><img src="https://img.shields.io/github/downloads/fampep/anikitty/total?style=for-the-badge&label=downloads&labelColor=0a0a0a&color=f5f5f5" alt="Downloads"></a>
    <a href="https://github.com/fampep/anikitty/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-Apache_2.0-f5f5f5?labelColor=0a0a0a&style=for-the-badge" alt="Apache License 2.0"></a>
    <img src="https://img.shields.io/badge/Android-8%2B-f5f5f5?labelColor=0a0a0a&style=for-the-badge" alt="Android 8 or newer">
  </p>

  <p>
    <a href="https://github.com/fampep/anikitty/releases/latest"><img src="https://img.shields.io/badge/download-stable-f5f5f5?style=for-the-badge&labelColor=0a0a0a" alt="Download the latest stable release"></a>
  </p>

  <p>
    <a href="https://ko-fi.com/E6C820K9H8"><img height="36" src="https://ko-fi.com/img/githubbutton_sm.svg" alt="Support AniKitty on Ko-fi"></a>
  </p>

  <p>
    <a href="https://t.me/Anikittymoe">Telegram</a>
    ·
    <a href="https://github.com/fampep/anikitty/issues">Issues</a>
  </p>
</div>

> [!WARNING]
> **Unofficial.** AniKitty is not affiliated with AniList, any studio, or any streaming site.
>
> **This project hosts no video.** A stream plays only when an extension returns a URL. The app does not control that site. The site may show ads or send you somewhere that is not safe.
>
> **You are responsible** for the laws where you are, and for the terms of every site an extension opens.
>
> **No warranty. Use at your own risk.** Install APKs only from the [releases of this repository](https://github.com/fampep/anikitty/releases). A file from anywhere else is not this project. Dev builds can break from one day to the next.

## Install

Package `site.anikitty.app`. Android 8 or newer.

The **stable** button opens the latest full release. Install the APK attached to that release. The stable shield stays on that tag.

**Dev** is the rolling signed build. Every push to `main` publishes the next prerelease, and the same file is also [anikitty-dev.apk](https://github.com/fampep/anikitty/releases/download/dev/anikitty-dev.apk). The dev shield follows the newest `v1.*` tag, including prereleases, and skips the floating `dev` tag. Prefer stable unless you want the newest build.

## The app

The APK is the product. It is a local-first Android app (Kotlin, Jetpack Compose, Media3). It does not sign you into a private AniKitty server.

| | |
| --- | --- |
| **Catalog** | AniList search, season, schedule, and title pages |
| **Sign-in** | AniList. Lists and your profile come from that account |
| **Library** | Continue watching and watch progress stay on the phone, and can sync to AniList |
| **Player** | Media3 on the device. Sub and dub, skip, picture-in-picture. Player and cast controls have names for TalkBack |
| **Cast** | Chromecast from the phone when Play services and a TV are available |
| **Offline** | Save an episode the player can store, and play that copy later |
| **Look** | Dark glass, white accent |

A stream needs an extension. Extensions that ship inside the APK are already on the phone. Anything else you install from the in-app Store, or by adding a manifest link yourself. The extension returns a URL. The phone plays that URL. It does not upload the episode.

## Extensions

| | |
| --- | --- |
| Author guide | [`extensions/GUIDE.md`](extensions/GUIDE.md) |
| Protocol | [`extensions/spec/PROTOCOL.md`](extensions/spec/PROTOCOL.md) |
| Submit a listing | [`extensions/store/SUBMIT.md`](extensions/store/SUBMIT.md) |
| Extension repo | [`fampep/anikitty-extensions`](https://github.com/fampep/anikitty-extensions) |
| Disclaimer | [`extensions/DISCLAIMER.md`](extensions/DISCLAIMER.md) |

Community extensions stay with their authors. A link in the store is not fampep running that server.

## Build

```bash
cd apps/android
./gradlew :app:assembleRelease
```

The release APK is `apps/android/app/build/outputs/apk/release/`. Version name and version code come from [`VERSION`](VERSION).

## License

Copyright 2026 fampep · [Apache License 2.0](LICENSE)

## Disclaimer

> [!WARNING]
> AniKitty is a client and a player. It is not a streaming service, a studio, or a file host.
>
> - It is unofficial. It is not affiliated with AniList, any studio, or any streaming site. Those names belong to their owners.
> - This repository hosts no episodes. An extension returns a URL. The phone plays that URL.
> - Third-party sites may show ads or send you to a page that is not safe. Anything that pops up during playback comes from that site, not from this app.
> - You choose the extension. You are responsible for the laws where you are and for the terms of the site you open. A stream that plays is not proof that the use is legal. This project does not give legal advice.
> - There is no warranty. Sections 7 and 8 of the [Apache License 2.0](LICENSE) are the warranty disclaimer and the limit of liability.
> - Install only from the [releases of this repository](https://github.com/fampep/anikitty/releases). Dev builds are unstable.

This product uses the TMDB API but is not endorsed or certified by TMDB.

Questions and bugs → [GitHub issues](https://github.com/fampep/anikitty/issues). Chat → [Telegram](https://t.me/Anikittymoe). Support → [Ko-fi](https://ko-fi.com/E6C820K9H8). Pull requests → [CONTRIBUTING.md](CONTRIBUTING.md).
