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
  "iconUrl": null,
  "nsfw": false
}
```

Rules:

- `id` — reverse-DNS, stable forever (changing it installs a *new* extension).
- `apiVersion` — must be `1` for current AniKitty builds.
- `baseUrl` — HTTPS origin of your resolver (no trailing slash).
- `resolvePath` — path joined to `baseUrl` (default `/v1/resolve`).

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

Errors: non-2xx with `{ "error": "human message" }` (optional). AniKitty surfaces the message in the UI.

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
