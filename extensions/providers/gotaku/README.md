# Gotaku

On-device resolver compiled into the AniKitty app from this folder.

`GotakuServer.kt` finds the title and episode. `GotakuCrypto.kt` unwraps the sealed API and the HLS playlist. The app’s player uses that same crypto while it reads bytes.

Each variant sets `quality` from `RESOLUTION` (`720p`, `1080p`, `4K`) and `audio` from `CODECS`, `CHANNELS`, and the sub/dub track. No grade is invented.

The extension version of Gotaku is built here. The phone still plays the stream itself.

Copyright 2026 fampep. [Apache License 2.0](../../LICENSE).
