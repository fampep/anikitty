# kaa

On-device resolver compiled into the AniKitty app from this folder.

kaa.lt is KickAssAnime. Search is `POST /api/fsearch`. Episodes are `GET /api/show/{slug}/episodes?ep=&lang=` with `ja-JP` for the original audio and `en-US` for the English dub. The episode document lists servers. VidStreaming's player id becomes `https://hls.krussdomi.com/manifest/{id}/master.m3u8`. Playback sends `Origin` and `Referer` of `https://krussdomi.com/`. Soft `.vtt` captions are kept when the player page lists them.

`quality` comes from the master playlist's `RESOLUTION`. `audio` is sub or dub. A missing fact stays null.

The extension version of kaa is built here. The phone still plays the stream itself.

Copyright 2026 fampep. [Apache License 2.0](../../LICENSE).
