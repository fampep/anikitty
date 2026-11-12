# AniKitty Desktop (Windows)

Compose Multiplatform **JVM desktop** app — the Windows companion to `apps/android`.

| | |
|---|---|
| Stack | Kotlin 2.0.21 · Compose Multiplatform 1.7.3 · Material3 |
| Auth | Same fixed Go VPS URL as Android (`ServerConfig.DEFAULT`) |
| Catalog | AniList GraphQL (trending + search) |
| Version | `packageVersion` **1.1.16** (aligned with Android) |
| Playback | Glass player + system **FFmpeg** / Ani.pm Settlar HLS · **no WebView** · not VLC |
| License | PolyForm Noncommercial 1.0.0 · Copyright 2026 fampep |

## Run (dev)

```bash
cd apps/desktop
./gradlew :composeApp:run
```

On Windows:

```bat
cd apps\desktop
gradlew.bat :composeApp:run
```

If Skiko cannot create a GL context (some remote/CI Linux desktops), force software rendering:

```bash
SKIKO_RENDER_API=SOFTWARE ./gradlew :composeApp:run
```

## Package (Windows `.exe`)

On **Windows** (JDK 21 + WiX for MSI):

```bat
cd apps\desktop
gradlew.bat :composeApp:createDistributable
gradlew.bat :composeApp:packageExe
```

- `createDistributable` → runnable `AniKitty.exe` under `composeApp/build/compose/binaries/.../app/AniKitty/`
- `packageExe` → Windows `.exe` installer
- CI: `.github/workflows/desktop-windows.yml` builds these on `windows-latest` and can attach them to a GitHub release tag

Linux/macOS local packaging still uses `packageDeb` / `packageDmg` for the current OS only — it cannot produce a Windows `.exe`.

## Layout

```
apps/desktop/
  composeApp/          # CMP desktop target (jvmMain)
  README.md
```

Shared KMP extraction with Android is planned next (theme, AniList models, scrapers) once the desktop shell stabilizes.

## Status (AP-54)

Runnable surface (AP-54 / AP-55):

- Glass dark AniKitty chrome (rail + Home / Search / Store / Account)
- Live AniList trending + search grids
- Title **Overview** (tap a poster): synopsis, genres, AniList season chips (PREQUEL/SEQUEL only), episode rail, related
- **Glass player** (AniKitty custom chrome + GlassScrubber): tap an episode → Ani.pm Settlar resolve → system **FFmpeg** decode (not VLC)
- Requires `ffmpeg` / `ffprobe` on PATH
- AniList is the sole catalog source; Store providers are stream links only
- Account shows dedicated auth server URL (sign-in UI next)

Merged to `main` via #45. Package with `./gradlew :composeApp:packageUberJarForCurrentOS` (portable) or `packageDistributionForCurrentOS` (native installer for this OS).
