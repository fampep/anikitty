# anizone

Bundled resolver. The phone searches anizone.to and plays the episode that site embeds. AniList stays the catalog. This resolver only matches a title.

Search is `GET https://anizone.to/anime?search=`, and the same path under `index.php` when that is the page the site serves. A card matches when its title, or another name on that same card, is the show. A movie or later season with a different title is left alone.

The episode page is `/anime/{id}/{number}`. The playable file is the HLS master on `media-player`. Subtitle tracks on that page are kept. English audio is used only when that page states an English file. A Japanese-only episode is not played as a dub.

Playback sends `Referer`, `Origin`, and `User-Agent` for anizone.to. The quality label is the tallest `RESOLUTION` on the master.

The extension version of anizone is built here. The phone still plays the stream itself.
