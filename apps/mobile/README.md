# Anikitty app

Native client for the existing Anikitty API. Screens are Expo Router routes on React Native. The Next.js site stays the server (auth, Postgres, catalog, and the stream API).

## Run

From the repo root, start the website so the app has an API:

```bash
npm install
npm run dev
```

Then the app:

```bash
cd apps/mobile
npm install
npm start
```

Android (device or emulator, with the Android SDK):

```bash
npm run android
```

Typecheck and the Android JS bundle (no SDK required):

```bash
npm run typecheck
npm run android:export
```

A release or debug APK still needs the Android SDK:

```bash
npx expo prebuild --platform android
npx expo run:android
```

## API address

The app calls `EXPO_PUBLIC_API_URL` when that env var is set. Otherwise Android uses `http://10.0.2.2:3000` (emulator host) and other targets use `http://localhost:3000`. Change it on the Profile screen. A physical device needs your computer's LAN address, for example `http://192.168.1.20:3000`.

Cleartext HTTP is allowed so a local server works. Point the app at `https://` for a deployed API.

## Windows

See [windows/README.md](windows/README.md). The project path is wired. A WinUI build is not produced here because `react-native-windows` does not yet match React Native 0.88, and this machine cannot run Visual Studio.

## Not ported

Forum, chat, messages, comments, shop, admin, donations, Discord linking, passkeys, watch-together, collections, subtitle library, opening/ending browser, provider picker beyond the site default (AniDelta), soft-subtitle overlay, and Anime4K. Playback uses `expo-video` against the existing `/api/kitty/stream` response. It does not embed the website.
