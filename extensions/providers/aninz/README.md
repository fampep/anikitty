# ani.nz

Bundled resolver. The phone searches ani.nz, opens that episode's settlar session, and plays the HLS master itself.

Search is `GET https://ani.nz/api/anime/search`. A show is matched on its AniList id, then on the exact title. The episode call is `GET /api/anime/playback-bootstrap/{source}/{id}`. Its selection opens `https://embed.settlar.io/api/embed/session`, which returns the playlist and subtitles. Sub or dub follows the episode language. Intro and credits are the bootstrap `op` and `ed` ranges when the site sends them.

Playback sends `Referer`, `Origin`, and `User-Agent` for `https://embed.settlar.io/`.

The extension version of ani.nz is built here. The phone still plays the stream itself.
