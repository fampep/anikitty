<div align="center">
  <img src="apps/android/app/src/main/res/drawable/anikitty_logo.png" alt="AniKitty" width="150" height="150">

  <p>
    <img src="https://img.shields.io/badge/platform-Android-white?labelColor=black&style=for-the-badge" alt="Android"/>
    <a href="https://github.com/fampep/anikitty/releases"><img src="https://img.shields.io/github/downloads/fampep/anikitty/total?color=white&labelColor=black&label=Downloads&style=for-the-badge" alt="GitHub Downloads"></a>
  </p>
  <p>
    <a href="https://github.com/fampep/anikitty/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-Apache_2.0-white?labelColor=black&style=for-the-badge" alt="Apache License 2.0"></a>
    <a href="https://github.com/fampep/anikitty/stargazers"><img src="https://img.shields.io/github/stars/fampep/anikitty?color=white&labelColor=black&style=for-the-badge" alt="Stars"></a>
    <a href="https://github.com/fampep/anikitty/releases/latest"><img src="https://img.shields.io/github/v/release/fampep/anikitty?color=white&labelColor=black&display_name=tag&style=for-the-badge&label=Stable" alt="Latest stable release"></a>
  </p>
</div>

# AniKitty

**AniKitty** is an Android app for your AniList. The catalog, lists, and schedule come from AniList. The phone plays the video itself with Media3.

A stream does not come from the app. A stream plays only when an **extension** resolves a URL. The default APK does not include a community extension.

> [!IMPORTANT]
> **AniKitty does not host video.** It does not store, provide, or ship episodes. It asks AniList for titles, and it asks an extension for a playable URL.
>
> **The default app has no extension installed.** Nothing from the extension store is preloaded. You add an extension yourself. Until one is installed, the player has no stream to open.
>
> **What does ship in the APK:** three first-party resolvers are compiled into the app so a fresh install can still play: **Anikoto** (selected), **Gotaku**, and **Ani.pm**. Those are part of the app, not store extensions. Any other source is an extension you install, and it is not in the default app.
>
> **Your responsibility:** you choose the extension and the service it talks to. You have to follow the law that applies to you, including copyright. fampep does not operate community extension servers.
>
> **No warranty.** The app is provided “as is” under the [Apache License 2.0](LICENSE). There is no promise that a title will play, that an extension will stay up, or that a cast to a TV will succeed.

## Downloads

<div align="center">
  <p>
    <a href="https://github.com/fampep/anikitty/releases/latest"><img src="https://img.shields.io/github/v/release/fampep/anikitty?color=white&labelColor=black&display_name=tag&style=for-the-badge&label=Stable" alt="Latest stable release"></a>
  </p>
  <p>
    <a href="https://github.com/fampep/anikitty/releases/download/v1.2.4/anikitty-1.2.4.apk"><img src="https://img.shields.io/badge/APK-anikitty--1.2.4.apk-white?labelColor=black&style=for-the-badge&logo=android&logoColor=white" alt="Download the stable APK"></a>
  </p>
</div>

The file to install for everyday use is the **stable** APK:

[anikitty-1.2.4.apk](https://github.com/fampep/anikitty/releases/download/v1.2.4/anikitty-1.2.4.apk)

Package name `site.anikitty.app`. Android 8 or newer. Allow installs from the browser, then open the file. If Android refuses an update because the signature or version does not line up, uninstall the old AniKitty first and install this one.

Pushes to `main` also publish a **dev prerelease**. Those builds are newer and less settled. They are listed on the [releases page](https://github.com/fampep/anikitty/releases) and are marked as prereleases. GitHub writes their notes. The stable badge above stays on the latest stable tag.

## The APK

The APK is the whole phone app. It is local-first. It does not sign you into a private AniKitty server, and it does not put a client secret in the app.

| | |
|---|---|
| Sign-in | AniList only, implicit grant (`anikitty://anilist`, client id 56768). No client secret. |
| Catalog | AniList. Home, Search, and Schedule read AniList. |
| My Space | Your AniList profile, list chips, continue watching, and favorites. |
| Player | Media3 on the phone. Sub and dub, the episode list, and a fullscreen view. Chromecast is offered when Play Services is on the phone and the TV is on the same Wi-Fi. |
| Look | Black page, white accent, black text on white controls. |
| Storage | Watch progress stays on the phone and can sync with your AniList list. The app does not download episodes to keep. |

On first open the name **AniKitty** is drawn on a black screen, then you sign in or land in the app.

Search can filter the AniList catalog. A title page shows the banner, stats, tags, and episodes. Play opens the video in a 16:9 frame. The episode shelf sits under it. Full screen is the landscape player.

Account (the gear on My Space) holds AniList, home layout, sources, and the app version. The extension store is opened from Sources.

## Extensions

Only an extension can supply a stream. The app sends it an AniList id and an episode number. The extension returns one or more URLs. Media3 plays that URL on the phone. The extension never receives an AniList password, and it is not a plugin loaded as app code. It is an HTTP resolver described by `anikitty-extension.json`.

The **default app does not have a community extension.** Open Sources and the store when you want one. You can install from the curated index or from a GitHub manifest URL. Every manifest needs an `iconUrl`.

| | |
|---|---|
| Author guide | [`extensions/GUIDE.md`](extensions/GUIDE.md) |
| Protocol | [`extensions/spec/PROTOCOL.md`](extensions/spec/PROTOCOL.md) |
| Submit a listing | [`extensions/store/SUBMIT.md`](extensions/store/SUBMIT.md) |
| Public extension repo | [`fampep/anikitty-extensions`](https://github.com/fampep/anikitty-extensions) |
| Disclaimer | [`extensions/DISCLAIMER.md`](extensions/DISCLAIMER.md) |

Anikoto, Gotaku, and Ani.pm are the resolvers compiled into the APK. They show up without an install. Removing them is not the same as uninstalling a store extension. Skip times used by the player are read from Anikoto’s episode data.

Community extensions stay with their authors. A link in the store index is not fampep running that server.

## Build it yourself

```bash
cd apps/android
./gradlew :app:assembleRelease
```

The release APK is `apps/android/app/build/outputs/apk/release/`. Version name and version code are the repo-root [`VERSION`](VERSION) file. GitHub Actions bumps that file when it publishes a dev prerelease.

| Path | What it is |
|---|---|
| `apps/android/` | The Android app (Kotlin, Jetpack Compose, Media3) |
| `extensions/` | The extension spec, the author guide, and the store index |
| `NOTICE` | Copyright notice that stays with copies of the code |

## License

**Copyright 2026 fampep.** AniKitty is licensed under the [Apache License, Version 2.0](LICENSE).

In short, the license lets you:

- Use the app and the source, in private or in a product, including commercial use.
- Copy it, change it, and share your changes.
- Grant others the same rights, including by sublicense.

If you share the source or a built APK, you also have to:

- Keep this copyright and the license text with it. The notice lives in [`NOTICE`](NOTICE) and at the top of the source files.
- Say which files you changed.
- Leave any existing attribution in place.

The license does **not**:

- Give you the AniKitty name as a trademark.
- Cover a community extension, or any video that extension points at. Those stay with their own authors and services.
- Promise that the app works, fits a purpose, or does not infringe someone else’s rights. It is **AS IS**.
- Make fampep liable for damage from using the app, to the extent the law allows.

The full terms are in [LICENSE](LICENSE). The short form above does not replace them.

## Support

Star the repository if you want the project to keep moving.

<div align="center">
  <a href="https://ko-fi.com/E6C820K9H8"><img height="36" src="https://ko-fi.com/img/githubbutton_sm.svg" alt="Support AniKitty on Ko-fi"></a>
</div>

Questions and bug reports go in [GitHub issues](https://github.com/fampep/anikitty/issues). Chat lives on [Telegram](https://t.me/Anikittymoe).

## Contribute

Pull requests are welcome. For a new stream source, start with the [author guide](extensions/GUIDE.md) and open a store submission rather than pasting a resolver into the app. The phone app should stay the player. The extension should stay the thing that finds the stream.
