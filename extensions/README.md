# AniKitty Extensions

**Public community home** for AniKitty stream-extension specs, guides, examples, and a curated **link** index.

> Educational custom-client project by **fampep**.  
> Third-party extensions are **community-run** — gladly contributed, not operated or controlled by the app owner.  
> Read [DISCLAIMER.md](./DISCLAIMER.md) before installing or publishing anything.

## Public GitHub

| Repo | Role |
|---|---|
| [`fampep/anikitty`](https://github.com/fampep/anikitty) | Android app. Compiles [providers](./providers) and plays streams on the phone. |
| [`fampep/anikitty-extensions`](https://github.com/fampep/anikitty-extensions) | This tree: spec, store, examples, and provider source. Owned by fampep. |

The in-app store loads  
`https://raw.githubusercontent.com/fampep/anikitty-extensions/main/store/index.json`  
and fills any missing listing from the copy in this monorepo. The newer `updatedAt` wins.  
Maintainer notes: [`../docs/public-github-setup.md`](../docs/public-github-setup.md).

## License & ownership

- **Copyright 2026 fampep. AniKitty is owned by fampep.** [PolyForm Noncommercial License 1.0.0](./LICENSE)
- Fork, modify, and contribute. See [DISCLAIMER.md](./DISCLAIMER.md) · [NOTICE](./NOTICE)
- Community extension *backends* stay owned by their authors — gladly linked, not controlled by fampep

## Quick links

| Doc | Purpose |
|---|---|
| [GUIDE.md](./GUIDE.md) | Author an extension |
| [spec/PROTOCOL.md](./spec/PROTOCOL.md) | HTTP resolve protocol |
| [spec/anikitty-extension.schema.json](./spec/anikitty-extension.schema.json) | Manifest schema |
| [store/index.json](./store/index.json) | Curated GitHub links for the in-app store |
| [examples/hello-http](./examples/hello-http) | Minimal template |
| [providers](./providers) | Anikoto, Gotaku, and Ani.pm source the app compiles |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | How to contribute listings & docs |

## Design

- Phone plays video (Media3). Extensions only return playable URLs + headers.
- Auth stays on the AniKitty dedicated server when used; extensions never receive account passwords.
- Users may paste any valid GitHub manifest URL — that path is fully user-directed.
