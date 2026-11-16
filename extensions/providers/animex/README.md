# animex

On-device resolver compiled into the AniKitty app from this folder.

animex.one publishes a catalog at `POST https://graphql.animex.one/graphql` (`searchAnime`) and episode data at `https://pp.animex.one/rest/api`. Episodes, servers, and sources are separate REST calls. The server marked default is tried first. Playback sends the `Referer`, `Origin`, and `User-Agent` that source listed. The same user agent is used when the source does not name one, because the playlist token is tied to it.

The master playlist is HLS. The default server names it `deeznuts.txt`. The player treats that URL as a playlist.

`quality` comes from the master playlist's `RESOLUTION`. `audio` is sub or dub. A missing fact stays null.

The extension version of animex is built here. The phone still plays the stream itself.

Copyright 2026 fampep. [Apache License 2.0](../../LICENSE).
