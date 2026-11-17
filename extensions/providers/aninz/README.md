# ani.nz

Bundled resolver. The phone searches ani.nz and plays that episode from ani.nz's own settlar server. The playlist is the HLS master on `media.settlar.io`. A third-party host is not used.

Search is `GET https://ani.nz/api/anime/search`. A show is matched on its AniList id, then on the exact title. The episode call is the full `GET /api/anime/playback-bootstrap/{source}/{id}` (no lean `core=0`). When that reply includes an episode route id, the same call is made again with that route, which is the address the site uses. Its selection opens `https://embed.settlar.io/api/embed/session`. The playable file must be on `media.settlar.io`. Sub or dub follows the episode language. The quality label is the tallest rung on the master, so a 1584×1080 ladder is 1080p. Intro and credits are the bootstrap `op` and `ed` ranges when the site sends them.

Playback sends `Referer`, `Origin`, and `User-Agent` for `https://embed.settlar.io/`.

The extension version of ani.nz is built here. The phone still plays the stream itself.
