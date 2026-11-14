# Providers

On-device resolvers for AniKitty. The Android app compiles this folder.
Playback stays on the phone. This repository is where the extension version of each provider is built.

| Folder | Provider |
|---|---|
| [anikoto](./anikoto) | Anikoto → MegaPlay, including skip times used for every provider |
| [gotaku](./gotaku) | Gotaku HLS unwrap |
| [reanime](./reanime) | reanime.cz |

Each resolver sets optional `quality`, `audio`, and `qualityRating` on `PlayableSource` only from data it parsed (HLS `RESOLUTION` / `CODECS` / `CHANNELS`, or the site’s own label). A missing fact stays null.

Copyright 2026 fampep. [Apache License 2.0](../LICENSE).
