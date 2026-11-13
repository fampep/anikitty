# Gotaku

On-device resolver compiled into the AniKitty app from this folder.

`GotakuServer.kt` finds the title and episode. `GotakuCrypto.kt` unwraps the sealed API and the HLS playlist. The app’s player uses that same crypto while it reads bytes.

The extension version of Gotaku is built here. The phone still plays the stream itself.

Copyright 2026 fampep. AniKitty is owned by fampep. [PolyForm Noncommercial License 1.0.0](../../LICENSE).
