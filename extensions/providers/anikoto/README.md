# Anikoto

On-device resolver compiled into the AniKitty app from this folder.

`AnikotoServer.kt` maps an AniList id to an Anikoto watch page, then returns MegaPlay URLs and headers. `MegaPlayCrypto.kt` reads the player key at runtime. Skip times from this provider are what the app uses for every stream.

The extension version of Anikoto is built here. The phone still plays the stream itself.

Copyright 2026 fampep. AniKitty is owned by fampep. [PolyForm Noncommercial License 1.0.0](../../LICENSE).
