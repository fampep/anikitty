# Screenshots

The pictures in the README are the public AniList catalog. They are not a signed-in account, and they are not the sample library.

`raw/` holds the unframed captures. The PNGs next to this file are the same shots composited onto Google's Pixel 8 device art, with a generated shadow. `hero.png` is the home shot, tilted, on the app's page black.

Device art is for this README only. Google says it must not be used in Play Store listings. The bezel files are downloaded when the frame script runs. They are not stored in the repo.

## Launch

Night mode, then the public catalog. The `browse` extra opens the app without signing in and without the sample library.

```bash
adb shell cmd uimode night yes
adb shell am start -n site.anikitty.app/.MainActivity --ez browse true
```

On a fresh install the splash runs for a few seconds, then a one-time welcome card may ask for **Let's go**. Dismiss that before capturing. Wait until poster art has painted. A shot taken too early is a black page.

The captures here are 1080×2400 at 420 dpi, the Pixel 8 panel, in night mode.

## Status bar

This is Android's status-bar demo, not the app's sample library. Set it before each capture, and leave it when you are done.

```bash
adb shell settings put global sysui_demo_allowed 1
adb shell am broadcast -a com.android.systemui.demo -e command enter
adb shell am broadcast -a com.android.systemui.demo -e command clock -e hhmm 1200
adb shell am broadcast -a com.android.systemui.demo -e command notifications -e visible false
adb shell am broadcast -a com.android.systemui.demo -e command battery -e level 100 -e plugged false
adb shell am broadcast -a com.android.systemui.demo -e command network -e wifi show -e level 4 -e mobile hide
adb exec-out screencap -p > docs/screenshots/raw/home.png
adb shell am broadcast -a com.android.systemui.demo -e command exit
```

## Frame

```bash
python3 scripts/frame_screenshots.py
```

The script fetches the Pixel 8 `layout`, `back.webp`, and `mask.webp` from the Android Studio device-art resources into `~/.cache/anikitty-device-art/pixel_8/`, then writes transparent framed PNGs and `hero.png`.

| File | Screen |
| --- | --- |
| `raw/home.png` | Home: featured title, Top 10, airing today |
| `raw/search.png` | Search grid of the public catalog |
| `raw/title.png` | Title page |
| `raw/title-episodes.png` | Episodes, season chips, and cast |
| `raw/player.png` | Player during playback |
| `raw/myspace.png` | My Space before sign-in, with on-device continue |
| `raw/settings.png` | Settings, account reads "Not signed in" |
