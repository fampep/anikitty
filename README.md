<div align="center">
  <img src="docs/brand/anikitty-icon-512.png" alt="AniKitty" width="96" height="96">

  <h1>AniKitty</h1>

  <p><strong>Your AniList, on the phone.</strong><br>
  Catalog from AniList. Playback with Media3. Progress stays on device.</p>

  <p>
    <a href="https://github.com/fampep/anikitty/releases/latest"><img src="https://img.shields.io/github/v/release/fampep/anikitty?display_name=tag&style=for-the-badge&label=stable&labelColor=0a0a0a&color=f5f5f5" alt="Latest stable release"></a>
    <a href="https://github.com/fampep/anikitty/releases"><img src="https://img.shields.io/github/v/release/fampep/anikitty?include_prereleases&display_name=tag&style=for-the-badge&label=dev&labelColor=0a0a0a&color=f5f5f5" alt="Latest release, including dev builds"></a>
    <a href="https://github.com/fampep/anikitty/releases"><img src="https://img.shields.io/github/downloads/fampep/anikitty/total?style=for-the-badge&label=downloads&labelColor=0a0a0a&color=f5f5f5" alt="Downloads"></a>
    <a href="https://github.com/fampep/anikitty/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-Apache_2.0-f5f5f5?labelColor=0a0a0a&style=for-the-badge" alt="Apache License 2.0"></a>
    <img src="https://img.shields.io/badge/Android-8%2B-f5f5f5?labelColor=0a0a0a&style=for-the-badge" alt="Android 8 or newer">
  </p>
</div>

<p align="center">
  <img src="docs/screenshots/home.png" alt="Home" width="260">
  &nbsp;
  <img src="docs/screenshots/title.png" alt="Title page" width="260">
</p>

<p align="center">Home and a title page on Pixel 8 — AniList catalog, true Sub / Dub latest.</p>

> [!WARNING]
> **Unofficial.** AniKitty is not affiliated with AniList, MyAnimeList, any studio, or any streaming site.
>
> **This project hosts no video.** Streams come from third-party sites. Those sites may show ads, pop-ups, or other pages that are not safe. This app does not control them.
>
> **You are responsible** for the laws where you are, and for the terms of every site a stream opens.
>
> **No warranty. Use at your own risk.** Sideload APKs only from the [official releases](https://github.com/fampep/anikitty/releases) of this repository. A file from anywhere else is not this project. Dev builds are unstable and can break from one day to the next.

## Get the APK

Package `site.anikitty.app` · Android 8+

<p align="center">
  <a href="https://github.com/fampep/anikitty/releases/latest"><img src="https://img.shields.io/badge/download-stable-f5f5f5?style=for-the-badge&labelColor=0a0a0a" alt="Download the latest stable release"></a>
  &nbsp;
  <a href="https://github.com/fampep/anikitty/releases/download/dev/anikitty-dev.apk"><img src="https://img.shields.io/badge/download-dev-f5f5f5?style=for-the-badge&labelColor=0a0a0a" alt="Download the latest dev build"></a>
</p>

Stable is the latest tagged release. Dev is the rolling `anikitty-dev.apk` — every push to `main` publishes a signed build. Prefer stable unless you want the newest (and breakiest) bits.

## What you get

| | |
| --- | --- |
| **Catalog** | AniList search, season, schedule, and title pages |
| **Series** | Related TV / ONA entries the AniList way (prequel / sequel). TMDB is for banner, logo, and stills |
| **Latest** | True Sub / Dub episode counts from the scrape widgets, not just air dates |
| **Player** | Media3 on-device. Watch progress stays on the phone |
| **Sources** | **Anikoto**, **Gotaku**, **reanime**, and **mkissa** ship in-app. Anything else is an extension you add |

Anikoto tries anikoto.cz first and [kotoplay.to](https://kotoplay.to/) when Anikoto is down or has no source. Sites change their players without notice — a title can stop playing when they do. The phone asks a resolver for a URL and plays that URL. It does not upload an episode and it does not keep a copy.

## Build

```bash
cd apps/android
./gradlew :app:assembleRelease
```

Version comes from [`VERSION`](VERSION). Extension authors: [`extensions/GUIDE.md`](extensions/GUIDE.md).

## License

Copyright 2026 fampep · [Apache License 2.0](LICENSE)

## Disclaimer

> [!WARNING]
> AniKitty is a client and a player. It is not a streaming service, a studio, or a file host.
>
> - It is unofficial. It is not affiliated with AniList, MyAnimeList, any studio, or any streaming site. Those names belong to their owners.
> - This repository hosts no episodes and ships no video library. A resolver returns a URL from a third-party site. The phone plays that URL.
> - Third-party sites may show ads or send you to a page that is not safe. Anything that pops up during playback comes from that site, not from this app.
> - You choose the source. You are responsible for the laws where you are and for the terms of the site you open. A stream that plays is not proof that the use is legal. This project does not give legal advice.
> - There is no warranty. Sections 7 and 8 of the [Apache License 2.0](LICENSE) are the warranty disclaimer and the limit of liability. A title may not play. A dev build may break.
> - Sideload only from the [releases of this repository](https://github.com/fampep/anikitty/releases). Dev builds are unstable.

Community extensions are not part of this repository. See [`extensions/DISCLAIMER.md`](extensions/DISCLAIMER.md).

This product uses the TMDB API but is not endorsed or certified by TMDB.

Questions and bugs → [GitHub issues](https://github.com/fampep/anikitty/issues). Pull requests → [CONTRIBUTING.md](CONTRIBUTING.md).
