# Screenshots

These files are local captures for reference. The README does not show them, and there is no project page. They are the public AniList catalog, night theme. They are not a signed-in account, and they are not the sample library.

`raw/` holds the unframed captures. The PNGs next to this file are the same shots composited onto Google's Pixel 8 device art, with a generated shadow.

Device art is for this README only. Google says it must not be used in Play Store listings. The bezel files are downloaded when the frame script runs. They are not stored in the repo.

## Launch

Night mode, then the public catalog. The `browse` extra opens the app without signing in and without the sample library.

```bash
adb shell cmd uimode night yes
adb shell am start -n site.anikitty.app/.MainActivity --ez browse true
```

On a fresh install the splash runs for a few seconds, then a one-time welcome card may ask for **Let's go**. Dismiss that before capturing. Wait until poster art has painted. A shot taken too early is a black page.

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

Open a title from Home before capturing `raw/title.png`.

## Frame

```bash
python3 scripts/frame_screenshots.py
```

The script fetches the Pixel 8 `layout`, `back.webp`, and `mask.webp` from the Android Studio device-art resources into `~/.cache/anikitty-device-art/pixel_8/`, then writes transparent framed PNGs.

| File | Screen |
| --- | --- |
| `raw/home.png` | Home: featured title and Latest Episodes (Sub / Dub) |
| `raw/title.png` | Title page |
