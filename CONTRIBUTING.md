# Contributing to AniKitty

Thanks for helping. AniKitty is early/alpha — expect broken edges and fast-moving APIs.

## Public contribution surface

The long-term plan:

| Surface | Purpose |
|---|---|
| `fampep/anikitty` | App + dedicated server (**intended public** for issues / PRs) |
| `fampep/anikitty-extensions` | Extension spec, guide, curated store (**intended public**) |

If either repo is still private, ask a maintainer to flip visibility / create the extensions repo. Agent tokens cannot always create repos or change visibility.

## What to work on

- **App / server** — PRs against `main` on `fampep/anikitty`. Prefer focused branches: `cursor/<topic>-d6f2`.
- **Extensions** — follow [`extensions/GUIDE.md`](extensions/GUIDE.md). Store listings: PR [`extensions/store/index.json`](extensions/store/index.json) (or the split `anikitty-extensions` repo once published).

## Do not

- Put secrets, VPS credentials, or user tokens in PRs.
- Rewrite the dedicated auth contract without an issue first.
- Ship malware / credential-harvesting “extensions”.

## Local Android build

```bash
cd apps/android
./gradlew :app:assembleRelease
```

## License & ownership

AniKitty is **owned by fampep** and licensed under [PolyForm Noncommercial 1.0.0](LICENSE). Contributions to this repository are accepted under those same terms and do not transfer ownership away from fampep.

Your own extension GitHub repos remain yours — see [`extensions/DISCLAIMER.md`](extensions/DISCLAIMER.md).
