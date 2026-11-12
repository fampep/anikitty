# AniKitty Android

The phone app browses AniList, signs in with AniList, and plays on the device. It does not call a dedicated server.

1. Sign in with AniList. Set that application's redirect URL to `anikitty://anilist`.
2. Browse and search the catalog on the phone.
3. Continue from AniList progress. Completed shows stay in the library.
4. Pick a stream source. Media3 plays on the phone.

Debug APKs allow cleartext HTTP globally. Release builds block cleartext.

## Build APK

```bash
./gradlew :app:assembleRelease
# app/build/outputs/apk/release/app-release.apk
```

### Optional: TMDB episode stills (Fribb)

Episode rail thumbnails prefer AniList streaming images, then TMDB stills via
[Fribb/anime-lists](https://github.com/Fribb/anime-lists) (AniList → TMDB / IMDb),
then the series cover.

TMDB needs a free v3 API key at build time. Do **not** paste keys into chat —
set one of:

```bash
# gradle.properties / CLI
./gradlew :app:assembleRelease -PtmdbApiKey=YOUR_KEY

# or environment (CI / local shell)
export TMDB_API_KEY=YOUR_KEY
./gradlew :app:assembleRelease
```

With no key the app still runs; Fribb mapping loads, but stills stay on AniList /
cover fallbacks.
