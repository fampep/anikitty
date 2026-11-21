# Contributing to AniKitty

AniKitty is an Android app. Pull requests land on `main` in [`fampep/anikitty`](https://github.com/fampep/anikitty).

## What to work on

- **App** — Kotlin, Jetpack Compose, and Media3 under `apps/android/`. Keep a change focused.
- **Extensions** — follow [`extensions/GUIDE.md`](extensions/GUIDE.md). Store listings go in [`extensions/store/index.json`](extensions/store/index.json). The public mirror is [`fampep/anikitty-extensions`](https://github.com/fampep/anikitty-extensions).

The phone does not use a private AniKitty server. Sign-in is AniList on the device.

## Do not

- Put secrets, tokens, or keystores in a pull request.
- Add a new streaming site as a built-in source unless a maintainer asked for it.
- Ship an extension that steals credentials or installs malware.

## Build

```bash
cd apps/android
./gradlew :app:assembleRelease
```

## License

Copyright 2026 fampep. AniKitty is licensed under the [Apache License 2.0](LICENSE). A contribution does not move that copyright away from fampep.

Your own extension repository stays yours. See [`extensions/DISCLAIMER.md`](extensions/DISCLAIMER.md).
