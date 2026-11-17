# xanime

On-device resolver compiled into the AniKitty app from this folder.

xanime.app is its own site. Search, episodes, and the player are GraphQL on `POST https://xanime.app/z2/` (`get_q27`, `get_q01`, `get_q07`). The request and the reply use the site's AES-GCM envelope. A show is matched on its AniList id, then on the exact title. Sub or dub follows the episode language. Playback sends `Referer`, `Origin`, and `User-Agent` for `https://xanime.app/`.

The master playlist is HLS (`a-master.m3u8`). Each variant is named `a-index-….ico` and is still a playlist. Media segments are MPEG-TS.

`quality` comes from the master playlist's `RESOLUTION`. `audio` is sub or dub. A missing fact stays null.

The extension version of xanime is built here. The phone still plays the stream itself.

Copyright 2026 fampep. [Apache License 2.0](../../LICENSE).
