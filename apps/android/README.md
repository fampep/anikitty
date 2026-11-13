# AniKitty Android

The phone app browses AniList, signs in with AniList, and plays on the device. It does not call a dedicated server.

1. Sign in with AniList. Set that application's redirect URL to `anikitty://anilist`.
2. Browse and search the catalog on the phone.
3. Continue from AniList progress. Completed shows stay in the library.
4. Pick a stream source. Media3 plays on the phone.

Debug APKs allow cleartext HTTP globally. Release builds block cleartext.

Episode counts, titles, and stills come from AniList. Airing shows with no final
count use the next airing episode, so long series list every episode that has aired.

## Build APK

```bash
./gradlew :app:assembleRelease
# app/build/outputs/apk/release/app-release.apk
```
