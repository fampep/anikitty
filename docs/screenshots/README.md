# Screenshot

The README has one picture: `app.png`. It is the public AniList catalog, night theme, not a signed-in account, and not the sample library.

```bash
adb shell cmd uimode night yes
adb shell am start -n site.anikitty.app/.MainActivity --ez browse true
adb exec-out screencap -p > docs/screenshots/app.png
```

On a fresh install the splash runs, then a one-time welcome card may ask for **Let's go**. Dismiss that and wait until the title art has painted.
