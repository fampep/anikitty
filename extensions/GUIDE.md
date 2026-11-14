# Author guide — AniKitty extension

You are building a **resolve server**: given AniList id + episode, return one or more stream URLs the phone can play.

## 1. Manifest

Create `anikitty-extension.json` at the **root** of a public GitHub repository:

```json
{
  "apiVersion": 1,
  "id": "com.example.hello",
  "name": "Hello HTTP",
  "version": "1.0.0",
  "description": "Minimal BYO resolve example",
  "author": "you",
  "homepage": "https://github.com/you/hello-anikitty-ext",
  "baseUrl": "https://your-resolver.example.com",
  "resolvePath": "/v1/resolve",
  "iconUrl": "https://www.google.com/s2/favicons?domain=watch.example.com&sz=128",
  "siteUrl": "https://watch.example.com",
  "nsfw": false
}
```

Rules:

- `id` — reverse-DNS, stable forever (changing it installs a *new* extension).
- `apiVersion` — must be `1`. Protocol 1.1 adds optional source fields without a new manifest version.
- `baseUrl` — HTTPS origin of your resolver (no trailing slash).
- `resolvePath` — path joined to `baseUrl` (default `/v1/resolve`).
- **`iconUrl` — required.** Must be the **brand/favicon of the site you scrape or front** (HTTPS). The Store shows this icon next to Anikoto and every listing. Install fails without it.
- `siteUrl` — recommended public origin of that site (Store “Site” button + attribution).

Validate against [spec/anikitty-extension.schema.json](./spec/anikitty-extension.schema.json).

## 2. Resolve endpoint

`POST {baseUrl}{resolvePath}`

Request JSON:

```json
{
  "anilistId": 21,
  "episode": 1,
  "audio": "sub",
  "titleHint": "One Piece"
}
```

| Field | Notes |
|---|---|
| `anilistId` | Required, > 0 |
| `episode` | Required, > 0 |
| `audio` | `"sub"` or `"dub"` |
| `titleHint` | Optional search helper from AniList titles |

Success `200` JSON:

```json
{
  "sources": [
    {
      "url": "https://cdn.example.com/ep1/master.m3u8",
      "headers": {
        "Referer": "https://watch.example.com/",
        "User-Agent": "Mozilla/5.0"
      },
      "label": "1080p",
      "quality": "1080p",
      "audio": "AAC 2.0 · SUB",
      "qualityRating": "FHD",
      "stripBytes": 0,
      "subtitles": [
        {
          "url": "https://cdn.example.com/ep1/en.vtt",
          "label": "English",
          "language": "en",
          "mimeType": "text/vtt"
        }
      ]
    }
  ]
}
```

### Source fields

| Field | Type | Required | When omitted | Examples |
|---|---|---|---|---|
| `url` | string | yes | source is dropped | `https://cdn.example.com/a.m3u8` |
| `label` | string | no | `"Stream"` | `"1080p"`, `"Auto · SUB"` |
| `quality` | string | no | no picture badge | `"720p"`, `"1080p"`, `"4K"` |
| `audio` | string | no | no audio badge | `"SUB"`, `"AAC 2.0 · DUB"`, `"AC3 5.1 · SUB"` |
| `qualityRating` | string | no | no grade badge | `"SD"`, `"HD"`, `"FHD"`, `"UHD"` |
| `headers` | object | no | none | `{ "Referer": "https://watch.example.com/" }` |
| `referer` / `origin` | string | no | not copied | shorthand for those headers |
| `stripBytes` | number | no | `0` | leading bytes to drop on segments |
| `subtitles` | array | no | none | `{ url, label, language?, mimeType? }` |

`quality` is the size the stream or site stated. `qualityRating` is a grade the site stated. Do not derive one from the other. A response with only `url` is still protocol 1.0 and still plays.

Errors: non-2xx with `{ "error": "human message" }` (optional). AniKitty surfaces the message. An empty `sources` array is a failure. A dropped connection is tried once. An HTTP error is not retried.

Built-in resolvers are compiled into the app and are not installed from this JSON. They write the same three optional fields when a playlist attribute or a provider label actually contains them. Your extension does that by sending the fields.

See [spec/PROTOCOL.md](./spec/PROTOCOL.md) for full field semantics (`stripBytes`, subtitle MIME, caching expectations).

## 3. Install from GitHub

Users paste any of:

- `https://github.com/owner/repo`
- `https://github.com/owner/repo/tree/main`
- `owner/repo`

AniKitty fetches:

`https://raw.githubusercontent.com/{owner}/{repo}/{ref}/anikitty-extension.json`

Default ref: `main` (falls back to `master` if needed).

## 4. Store listing

Fork / PR into [store/index.json](./store/index.json):

```json
{
  "id": "com.example.hello",
  "name": "Hello HTTP",
  "description": "Minimal BYO resolve example",
  "github": "https://github.com/you/hello-anikitty-ext",
  "author": "you",
  "featured": false
}
```

## 5. Local smoke test

```bash
curl -sS -X POST https://your-resolver.example.com/v1/resolve \
  -H 'content-type: application/json' \
  -d '{"anilistId":21,"episode":1,"audio":"sub"}' | jq .
```

Confirm Media3 can open the returned URL with the returned headers (Referer / UA matter for many CDNs).

## 6. What not to do

- Do not put AniKitty account passwords in your extension.
- Do not return HTML pages — only direct media URLs (HLS / MP4 / DASH).
- Do not rely on cleartext HTTP unless you know the client network policy allows that host.
- Do not change `id` casually; ship `version` bumps instead.
