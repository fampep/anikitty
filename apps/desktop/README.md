# AniKitty Desktop (Windows)

Compose Multiplatform **JVM desktop** app — the Windows companion to `apps/android`.

| | |
|---|---|
| Stack | Kotlin 2.0.21 · Compose Multiplatform 1.7.3 · Material3 |
| Auth | Same fixed Go VPS URL as Android (`ServerConfig.DEFAULT`) |
| Catalog | AniList GraphQL (trending + search) |
| Version | Repo-root `VERSION` → `packageVersion` (lockstep with Android) |
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

## Install (Windows) — prefer the portable zip

From a GitHub release, download **`AniKitty-*-windows-x64.zip`** (not the tiny lone `AniKitty.exe` stub):

1. Unzip anywhere (e.g. `Downloads\AniKitty`)
2. Run `AniKitty\AniKitty.exe`
3. Put **`ffmpeg`** and **`ffprobe`** on PATH (player needs them)

### MSI / Setup.exe error **2503** / **2502**

Those codes are Windows Installer permission failures (temp / `C:\Windows\Installer`), not a bad AniKitty build. Fixes:

- Prefer the **portable zip** above (no installer)
- Or right-click `AniKitty-*.exe` / `.msi` → **Run as administrator**
- Or from an elevated Command Prompt: `msiexec /i AniKitty-1.1.17.msi`

## Package (Windows `.exe`) — developers

On **Windows** (JDK 21 + WiX for MSI):

```bat
cd apps\desktop
gradlew.bat :composeApp:createDistributable
gradlew.bat :composeApp:packageExe
```

- `createDistributable` → runnable app folder with `AniKitty.exe` (what we zip for releases)
- `packageExe` / `packageMsi` → Windows installers (may hit 2503 without admin)
- CI: `.github/workflows/desktop-windows.yml` on `windows-latest`

Linux/macOS local packaging still uses `packageDeb` / `packageDmg` for the current OS only — it cannot produce a Windows `.exe`.

## Layout

```
apps/desktop/
  composeApp/          # CMP desktop target (jvmMain)
  README.md
```

Shared KMP extraction with Android is planned next (theme, AniList models, scrapers) once the desktop shell stabilizes.

## Status (AP-65)

Real desktop app surface (not a sparse shell):

- Atmospheric glass chrome with top nav + **Featured** hero home
- Trending poster grid + hover cards; Search with debounce
- Title overview: cinematic hero, Play CTA, seasons, episode rail, related
- Glass player (FFmpeg + Ani.pm) · Store / Account as first-class screens
- Requires `ffmpeg` / `ffprobe` on PATH
