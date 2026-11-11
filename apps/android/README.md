# AniKitty Android (dedicated APK)

**Product = this APK + your Go dedicated server.** No website required.

1. Sign in / create account on **your** dedicated server (username + password only).
2. Browse AniList on-device.
3. Pick a built-in **watch server** (e.g. Anikoto) — no third-party extension installs.
4. Phone resolves a playable **URL** only; Media3 streams on-device (bandwidth on the phone).
5. History can stay local (Room); dedicated server sync is for logged-in users only.

## Dedicated server

```bash
cd apps/dedicated-server
export JWT_SECRET="$(openssl rand -base64 48)"
go run ./cmd/server   # :8788
```

In the app, set Server URL to `http://<laptop-lan-ip>:8788` (emulator default `http://10.0.2.2:8788`).

## Build APK

```bash
./gradlew :app:assembleDebug
# app/build/outputs/apk/debug/app-debug.apk
```
