# gogoanime

Bundled resolver. The phone searches gogoanime.by and plays the episode that site embeds. AniList stays the catalog. This resolver only matches a title.

Search is `GET https://gogoanime.by/?s=`. A show is matched on the title. The exact title wins, and a movie, sequel, year, or TV suffix ranks below the closer title. A cyrillic lookalike in the site title still matches the Latin title. Dub prefers a series whose title says dubbed, and a sub request does not play that series.

The series page lists every episode. Sub links end in `english-subbed`. Dub links end in `english-dubbed`. The episode page has a player button for that language. The player page embeds MegaPlay (`megaplay.su`) or MegaVid (`megavid.buzz`).

MegaPlay puts the HLS file in the embed page. MegaVid puts a source address in the player page. When that copy does not play, the same call with `provider=1` is the file the site uses next. The playable URL has to be on `megaplay.su`, `megavid.buzz`, or `megavid.se`. Any other host is dropped.

The quality label is the server button when it says HD or SD. A master playlist that states `RESOLUTION` and `CODECS` uses that rung instead. Intro and credits are the MegaVid chapter ranges when the site sends them.

Playback sends `Referer`, `Origin`, and `User-Agent` for the embed that supplied the file.

The extension version of gogoanime is built here. The phone still plays the stream itself.
