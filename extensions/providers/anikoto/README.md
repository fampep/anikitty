# Anikoto

`quality` comes from a resolution in the embed label (`1080p`, `4K`). `qualityRating` is set only when that label contains HD, FHD, UHD, SD, or HQ. `audio` is `SUB` or `DUB` from the track that was resolved.

On-device resolver compiled into the AniKitty app from this folder.

`AnikotoServer.kt` maps an AniList id to an Anikoto watch page, then returns MegaPlay URLs and headers. If anikoto.cz does not answer, or has no playable source, the same provider uses kotoplay.to. Kotoplay is another front end for the same MegaPlay catalog: `/data/suggest`, `/data/anime`, and `/data/servers` return the embed URL. Subtitles, qualities, and seek sprites still come from MegaPlay. A single preview PNG on kotoplay is not used as a seek sheet. `MegaPlayCrypto.kt` reads the player key at runtime. Skip times from this provider are what the app uses for every stream.

The extension version of Anikoto is built here. The phone still plays the stream itself.

Copyright 2026 fampep. [Apache License 2.0](../../LICENSE).
