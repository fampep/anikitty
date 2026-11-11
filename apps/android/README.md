# AniKitty Android (native)

Kotlin + Jetpack Compose client. **This APK is the product.** The Next.js site at `anikitty.site` is the API/backend (auth, Postgres, catalog, streams) — not a Capacitor/TWA wrap of the website.

Scaffold only: debug build, health/login/me probes, Bearer token storage. Feature parity is intentionally not claimed here.

Plan (project store): `/cursor/stores/bc-aaadc828-6a2d-404f-9c07-93db4520eab7/docs/android-apk-plan.md`

## Requirements

- JDK 17+
- Android SDK (API 35 platform + build-tools 35)
- `ANDROID_HOME` / `ANDROID_SDK_ROOT`, or `local.properties` with `sdk.dir=…` (see `local.properties.example`)

## Build a debug APK

```bash
cd apps/android
./gradlew :app:assembleDebug
```

APK path:

```text
app/build/outputs/apk/debug/app-debug.apk
```

Install on a device/emulator:

```bash
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

From the repo root:

```bash
npm run android:assembleDebug
```

Debug application id: `site.anikitty.app.debug` (release id: `site.anikitty.app`).

## Configure API base URL

Default production base URL is baked in as `https://anikitty.site` (`BuildConfig.API_BASE_URL` in `app/build.gradle.kts`).

For a local Next.js server from an emulator, change that field to `http://10.0.2.2:3000` (cleartext allowed for localhost / 10.0.2.2 via `network_security_config.xml`).

## How auth & content APIs are consumed

| Concern | Approach |
|---|---|
| Login | `POST /api/account/auth/login` with `{ "passphrase": "…" }` (same as web) |
| Session | Success JSON includes `token` (JWT). Store in EncryptedSharedPreferences (`TokenStore`) |
| 2FA | If TOTP is on, login returns HTTP 200 `{ requires2fa, pendingToken }` (no session token). Scaffold detects this; `POST /api/account/auth/2fa-verify` UI is a later milestone |
| Gated APIs | `Authorization: Bearer <token>` — middleware already accepts Bearer as well as the `ak_session` cookie |
| Who am I | `GET /api/account/me` |
| Health | `GET /api/health` (public) |
| Catalog / watch / streams | Same `/api/anime/**`, `/api/account/watch/**`, `/api/kitty/**` routes the website uses — wire screens later |
| Passkeys | Phase 2: Android Credential Manager against `/api/account/auth/passkey/**` + Digital Asset Links for `anikitty.site` |

Do **not** invent a parallel auth stack. Prefer extending the existing API when cookie-only flows block mobile.

## Release signing (placeholders)

1. Copy `keystore.properties.example` → `keystore.properties` (gitignored).
2. Point `storeFile` at your upload keystore.
3. `./gradlew :app:assembleRelease`

CI secrets (later): `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`.

## Distribution

- **Sideload / GitHub Releases:** use debug or signed release APKs for early testers.
- **Play Store:** keep package name stable before first upload; decide with product owner.

## Out of scope (this scaffold)

Full UI port, Media3 player, passkeys, Play listing, deleting the web app, or changing Coolify production deploy.
