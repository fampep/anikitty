# Windows

This folder is the React Native Windows project location declared in `react-native.config.js` (`sourceDir: windows`, solution `Anikitty.sln`).

The solution is not in the tree yet. `react-native-windows@0.85.0` is the newest release and it peers `react-native@^0.85`. This app is Expo SDK 58, which uses `react-native@0.88.1`. Installing 0.85 against 0.88 would not build.

What is left:

1. A `react-native-windows` release that matches React Native 0.88.
2. A Windows machine with Visual Studio 2022 (Desktop development with C++) and the Windows SDK.
3. From `apps/mobile`:

```bash
npm install react-native-windows@<matching version>
npx @react-native-community/cli init-windows --overwrite --projectName Anikitty
npx react-native run-windows
```

`npm run windows` prints the same checklist. Android does not depend on this folder.
