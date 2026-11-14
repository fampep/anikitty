# Submit an extension to the main AniKitty store

The **main store** is the curated index at [`index.json`](./index.json) (and eventually `fampep/anikitty-extensions`).

## In the app

Open **Store** → **Submit**. That opens the GitHub issue form for fampep.

## On GitHub

1. Publish your public repo with a valid `anikitty-extension.json` (**`iconUrl` required** — use the scraped site’s favicon).
2. Open an issue with the **Extension store submission** template, **or** PR a new entry into `store/index.json`.

Required store fields:

| Field | Notes |
|---|---|
| `id` | Same as manifest `id` |
| `name` / `description` / `author` | Short, honest |
| `github` | Your repo or tree URL |
| `iconUrl` | **Required** — site brand icon HTTPS URL |
| `siteUrl` | Recommended scraped-site origin |
| `manifestPath` | If the manifest is not at repo root |

You keep ownership of your resolver. A listing is a link, not fampep control. See [../DISCLAIMER.md](../DISCLAIMER.md).

Protocol 1.1: each source may include optional `quality`, `audio`, and `qualityRating`. Leave a field out when the stream does not state it. See [../spec/PROTOCOL.md](../spec/PROTOCOL.md).
