# mkissa

On-device resolver compiled into the AniKitty app from this folder.

mkissa.to is a catalog. Search is a public GraphQL `shows` query on `api.mkissa.net`, matched by AniList id. Episode sources are behind the site's aa-crypto lane. The phone seals that query and opens the reply. It keeps a direct MP4 or HLS file and skips iframe hosts. The file host requires a Referer of `https://mkissa.to/`.

`quality` comes from the episode's stated video height. `audio` is sub, dub, or raw. A missing fact stays null. Episode stills are not a seek-thumbnail track, and the episode payload does not list subtitles.

The crypto constants track the current site build (`189`). A new build needs those constants updated before episodes will open again.

The extension version of mkissa is built here. The phone still plays the stream itself. In the app it is tried after reanime.

Copyright 2026 fampep. [Apache License 2.0](../../LICENSE).
