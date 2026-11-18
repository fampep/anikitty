# animepahe

Bundled resolver. The phone searches animepahe.pw and plays that episode from the kwik link on the play page.

Search is `GET https://animepahe.pw/api?m=search&q=`. A show is matched on the exact title, then on a title that contains the query. TV wins when several rows match. Episodes are `GET /api?m=release&id={session}&sort=episode_asc&page=`. The play page is `/play/{session}/{episode session}`. Each resolution button carries `data-src` (the kwik embed), `data-resolution`, and `data-audio` (`jpn` or `eng`). Sub asks for Japanese. Dub asks for English. The highest resolution for that language is used, and an H.264 button is preferred when the same height is also offered as AV1.

The embed page's packed script is unpacked on the phone. The playlist address inside it is what plays. When that page has a download form instead, the phone posts the token and follows the redirect. Playback sends `Referer`, `Origin`, and `User-Agent` for the kwik host that served the embed. The quality label is the tallest rung on the playlist. A single file uses the button's resolution.

The extension version of animepahe is built here. The phone still plays the stream itself.
