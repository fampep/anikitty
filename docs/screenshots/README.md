# Screenshots

The pictures in this folder are the demo library. They are not a signed-in AniList account, and they are not captured from someone else's list.

Demo mode ships in debug and release. The sign-in screen has a **Try demo** button labelled as a sample library. The same mode starts from an intent extra. Demo titles, continue-watching rows, and My Space lists live in memory. Playback is a short clip bundled in the app. Demo mode does not write the AniList token and does not write the on-device watch history, so a later real sign-in is left alone.

## Launch

```bash
adb shell am start -n site.anikitty.app/.MainActivity --ez demo true
```

The shots here were taken in night mode on a 720×1280 emulator:

```bash
adb shell cmd uimode night yes
```

On a fresh install the splash runs for a few seconds, then a one-time welcome card may ask for **Let's go**. Dismiss that before capturing.

Leave demo from Settings → Account → Leave demo, or sign in. Leaving demo does not clear an AniList token.

## Recapture

Install a build, launch with the command above, then:

```bash
adb exec-out screencap -p > docs/screenshots/home.png
```

Walk the same screens the gallery uses:

| File | Screen |
| --- | --- |
| `home.png` | Home, hero and the continue heading |
| `home-continue.png` | Continue card, airing, and this season |
| `home-swipe.gif` | A short swipe across the hero |
| `title.png` | A demo title, with picture and sound marks |
| `title-episodes.png` | Episode shelf |
| `player.png` | Player for the bundled clip |
| `search.png` | Search, showing the demo catalog |
| `myspace.png` | My Space |
| `settings.png` | Settings groups |
| `menu.png` | Home overflow (Search, Refresh, Settings) |

For the gif, record a few seconds while swiping the hero, then scale it down:

```bash
adb shell screenrecord --time-limit 4 /sdcard/home-swipe.mp4
adb pull /sdcard/home-swipe.mp4
ffmpeg -i home-swipe.mp4 -vf "fps=12,scale=220:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=64[p];[s1][p]paletteuse" -loop 0 docs/screenshots/home-swipe.gif
```
