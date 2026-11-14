# reanime

On-device resolver compiled into the AniKitty app from this folder.

`ReanimeServer.kt` maps an AniList id to a reanime.cz slug, then to a FlixCloud HLS master. The phone decrypts the embed and unwraps the playlist. Media3 plays the result.

The master sets `quality` from `RESOLUTION` and `audio` from sub or dub. A missing fact stays null.

The extension version of reanime is built here. The phone still plays the stream itself.

Copyright 2026 fampep. [Apache License 2.0](../../LICENSE).
