# AniKitty Extensions

**Public community home** for AniKitty stream-extension specs, guides, examples, and a curated **link** index.

> Educational custom-client project by **fampep**.  
> Third-party extensions are **community-run** — gladly contributed, not operated or controlled by the app owner.  
> Read [DISCLAIMER.md](./DISCLAIMER.md) before installing or publishing anything.

## Intended public GitHub

| Repo | Role |
|---|---|
| [`fampep/anikitty`](https://github.com/fampep/anikitty) | Android app + dedicated auth server |
| **`fampep/anikitty-extensions`** (this tree) | Spec, guide, store index, examples |

Until the dedicated public repo exists, this folder in the monorepo is the source of truth. Maintainer publish steps: [`../docs/public-github-setup.md`](../docs/public-github-setup.md).

## License & ownership

- **Owned by fampep** — copyright retained; not MIT
- **PolyForm Noncommercial 1.0.0** — [LICENSE](./LICENSE) ([human-readable](https://polyformproject.org/licenses/noncommercial/1.0.0))
- Educational / personal / noncommercial use; see [DISCLAIMER.md](./DISCLAIMER.md) · [NOTICE](./NOTICE)
- Community extension *backends* stay owned by their authors — gladly linked, not controlled by fampep

## Quick links

| Doc | Purpose |
|---|---|
| [GUIDE.md](./GUIDE.md) | Author an extension |
| [spec/PROTOCOL.md](./spec/PROTOCOL.md) | HTTP resolve protocol |
| [spec/anikitty-extension.schema.json](./spec/anikitty-extension.schema.json) | Manifest schema |
| [store/index.json](./store/index.json) | Curated GitHub links for the in-app store |
| [examples/hello-http](./examples/hello-http) | Minimal template |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | How to contribute listings & docs |

## Design

- Phone plays video (Media3). Extensions only return playable URLs + headers.
- Auth stays on the AniKitty dedicated server when used; extensions never receive account passwords.
- Users may paste any valid GitHub manifest URL — that path is fully user-directed.
