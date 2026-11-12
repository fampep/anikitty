# AniKitty Android (dedicated APK)

**Product = this APK + your Go dedicated server.** No website required.

1. Sign in / create a **password account** on your dedicated server (AniList is not required to enter).
2. Browse AniList catalog data on-device.
3. Optionally **link AniList from Account** to sync your list / progress.
4. Pick a built-in **watch server** (e.g. Anikoto) — no third-party extension installs.
5. Phone resolves a playable **URL** only; Media3 streams on-device (bandwidth on the phone).
6. History can stay local (Room); dedicated server sync is for logged-in users only.

## Dedicated server

```bash
cd apps/dedicated-server
export JWT_SECRET="$(openssl rand -base64 48)"
go run ./cmd/server   # :8788
```

Auth UI is AniKitty monochrome cinema. The dedicated server URL stays locked in code and is **never shown** in the app UI.

Login uses a **passphrase** (10+ chars). Generate a random passphrase on create; optionally save it on-device.

Debug APKs allow cleartext HTTP globally. Release builds allow cleartext only for the
locked VPS host in `network_security_config.xml` (`ServerConfig.DEFAULT`); community
skip hosts stay HTTPS.

## Build APK

```bash
./gradlew :app:assembleRelease
# app/build/outputs/apk/release/app-release.apk
```
