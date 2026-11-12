# AniKitty Desktop (Windows)

Compose Multiplatform **JVM desktop** app — the Windows companion to `apps/android`.

| | |
|---|---|
| Stack | Kotlin 2.0.21 · Compose Multiplatform 1.7.3 · Material3 |
| Auth | Same fixed Go VPS URL as Android (`ServerConfig.DEFAULT`) |
| Catalog | AniList GraphQL (trending + search) |
| Playback | Not yet — will use on-device scrapers (Anikoto / Gotaku / Ani.pm), **no WebView** |
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

## Package

```bash
./gradlew :composeApp:packageDistributionForCurrentOS
```

Produces a native installer for the **current** OS (MSI on Windows, Deb on Linux, DMG on macOS) under `composeApp/build/compose/binaries/`.

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

**Do not open a PR until fampep asks** — keep polishing on `cursor/windows-desktop-cmp-91b9`.
