# AniKitty Extensions

Bring-your-own **stream resolve** servers for [AniKitty](https://github.com/fampep/anikitty).

AniKitty’s auth VPS and on-device Media3 playback stay first-party.  
**What moves out of the APK:** hardcoded watch scrapers.  
**What you ship:** a small HTTP service + an `anikitty-extension.json` manifest in a GitHub repo.

> **Status:** Draft API `v1`. The Android client on branch `cursor/extension-architecture-d6f2` installs manifests from GitHub links and a curated store index.

## Quick start

1. Read [GUIDE.md](./GUIDE.md) — author an extension in ~15 minutes.
2. Copy [examples/hello-http](./examples/hello-http) and point `baseUrl` at your resolver.
3. Push a public GitHub repo with `anikitty-extension.json` at the root (or documented path).
4. In AniKitty → Account → **Extensions** → paste the repo URL → Install.
5. Optional: open a PR against [store/index.json](./store/index.json) to list it in the in-app store.

## Spec

| Doc | Purpose |
|---|---|
| [spec/anikitty-extension.schema.json](./spec/anikitty-extension.schema.json) | Manifest JSON Schema |
| [spec/PROTOCOL.md](./spec/PROTOCOL.md) | HTTP resolve protocol (`apiVersion` 1) |
| [GUIDE.md](./GUIDE.md) | Human author guide |
| [store/index.json](./store/index.json) | Curated store listings |

## Design principles

- **Phone plays video.** Extensions return playable request URLs (+ headers). HLS/DASH bytes stay on-device via Media3.
- **Auth is separate.** Password / session accounts still hit the AniKitty dedicated Go server.
- **Trust is explicit.** Users paste a GitHub URL or install from the store. No silent APK sideloads.
- **HTTPS preferred.** Cleartext only works for hosts the OS/network policy already allows.

## Fampep naming

| Repo (intended) | Role |
|---|---|
| `fampep/anikitty` | Android app + dedicated server |
| `fampep/anikitty-extensions` | This package (spec, guide, store, examples) — publish when GitHub create rights allow |

Until `anikitty-extensions` exists as its own public GitHub repo, this tree lives under `extensions/` in the main AniKitty monorepo and is the source of truth for the protocol.
