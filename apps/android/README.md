# AniKitty Android (local-first APK)

Kotlin + Jetpack Compose client. **No sign-in.** Catalog comes from public AniList GraphQL; watch history and extension toggles live **on the device** (Room + SharedPreferences).

Playback via real provider extensions + Media3 is the next milestone — the Extensions tab is the on-device switchboard with placeholders today.

## Build a debug APK

Requirements: JDK 17+, Android SDK (API 35).

```bash
cd apps/android
# optional: echo "sdk.dir=$ANDROID_HOME" > local.properties
./gradlew :app:assembleDebug
```

APK output:

```text
app/build/outputs/apk/debug/app-debug.apk
```

Install:

```bash
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

From repo root: `npm run android:assembleDebug`.

Debug application id: `site.anikitty.app.debug`.

### On your phone (sideload)

1. Build the APK (or download the artifact from CI / a shared build).
2. Copy `app-debug.apk` to the phone.
3. Allow install from that source, open the APK, install.
4. Open **AniKitty** — Home/Search work without an account.

## What works now

| Feature | Behavior |
|---|---|
| Home | Trending anime from AniList (no login) |
| Search | AniList search |
| History | Stored in local SQLite (`anikitty-local.db`) |
| Extensions | Enable/disable on-device stubs (no real streams yet) |

Tap a title on Home/Search to add/update local continue-watching.

## What is not in this build

- Website passphrase / passkey / account sync
- Real stream scraping / HLS player
- Cloud sync of history

## Release signing

See `keystore.properties.example` for release builds. Debug APK uses the automatic debug keystore.
