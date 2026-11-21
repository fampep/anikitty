# AniKitty Android

The phone app. Catalog and sign-in are AniList. Media3 plays on the device. A stream needs an extension: some ship inside the APK, and others come from the Store or a manifest you add. Watch progress stays on the phone and can sync to AniList. The app does not call a private AniKitty server.

For install links, the stable and dev builds, and the license, see the [root README](../../README.md).

1. Sign in with AniList. The redirect URL is `anikitty://anilist`.
2. Browse and search the catalog on the phone.
3. Continue from progress stored on the device. Completed shows stay in the library.
4. Pick an extension. Media3 plays the URL it returns. You can save an episode the player can store.

Debug APKs allow cleartext HTTP globally. Release builds block cleartext.

## Build APK

```bash
./gradlew :app:assembleRelease
# app/build/outputs/apk/release/app-release.apk
```

Version name and version code come from the repo-root `VERSION` file.
