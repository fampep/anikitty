# AniKitty extension protocol — 1.1

Manifest `apiVersion` stays **1**. Protocol 1.1 only adds optional source fields. Clients that speak 1.0 ignore unknown JSON keys. Servers that omit the new fields keep working.

## Changelog

### 1.1

- Optional per-source `quality`, `audio`, and `qualityRating`.
- Omitted fields mean “unknown”. The app shows no badge for a missing field.
- Built-in resolvers (Anikoto, Gotaku, Ani.pm) fill the same fields when the playlist or provider label actually states them. They do not invent a grade from height.

### 1.0

- Manifest, `POST /v1/resolve`, headers, subtitles, `stripBytes`.

## Roles

| Component | Responsibility |
|---|---|
| AniKitty APK | Auth VPS, AniList browse, Media3 + Chromecast playback |
| Extension HTTP service | Map AniList → playable URL(s) + request headers |
| Manifest (GitHub) | Discoverability + install metadata |

## Manifest discovery

Primary file: `anikitty-extension.json` (repo root).

Required fields: `apiVersion`, `id`, `name`, `version`, `baseUrl`, `iconUrl`.  
Optional: `description`, `author`, `homepage`, `resolvePath`, `siteUrl`, `nsfw`.

- `iconUrl` — HTTPS brand/favicon of the **site you scrape or front** (shown in the Extension Store).
- `siteUrl` — recommended public origin of that site.

`resolvePath` defaults to `/v1/resolve`.

## Resolve

### Request

`POST {baseUrl}{resolvePath}`  
`Content-Type: application/json`

```ts
{
  anilistId: number;   // > 0
  episode: number;     // > 0
  audio: "sub" | "dub";
  titleHint?: string | null;
}
```

### Response

`200 application/json`

```ts
{
  sources: Array<{
    url: string;                          // absolute http(s) media URL
    headers?: Record<string, string>;     // request headers for Media3
    referer?: string;                     // shorthand for headers.Referer
    origin?: string;                      // shorthand for headers.Origin
    label?: string;                       // display name in the quality sheet, e.g. "1080p"
    quality?: string;                     // picture size the source stated, e.g. "1080p" or "4K"
    audio?: string;                       // audio the source stated, e.g. "AAC 2.0 · SUB"
    qualityRating?: string;               // provider grade, e.g. "HD". Not computed by the app
    stripBytes?: number;                  // leading bytes to strip (MegaPlay-style); 0 = none
    subtitles?: Array<{
      url: string;
      label: string;
      language?: string | null;
      mimeType?: string | null;
    }>;
  }>;
}
```

Constraints:

- At least one `sources[]` entry with a non-empty `url`.
- `url` must be absolute (`http://` or `https://`).
- Headers are passed through to Media3; common keys: `Referer`, `Origin`, `User-Agent`, `Cookie`.
- `referer` and `origin` are copied into those headers when the header map does not already set them.
- The client keeps the first copy of a repeated `url`, and plays the highest labeled quality first (`1080p` before `720p`).
- A dropped connection is tried once more. An HTTP error is not retried.
- Empty `sources` → client treats as failure.
- `quality`, `audio`, and `qualityRating` are optional strings. Trimmed blank values are treated as omitted.
- There is no enum. Examples that the app will show as-is: `quality` `"480p"` `"720p"` `"1080p"` `"4K"`; `audio` `"SUB"` `"DUB"` `"AAC 2.0 · SUB"` `"AC3 5.1 · DUB"`; `qualityRating` `"SD"` `"HD"` `"FHD"` `"UHD"`.
- Do not send a grade you did not read from the stream or the site. The app will not fill one in.
- `label` is still the sheet name. It is not copied into `quality`.

### Minimal example

Request:

```json
{ "anilistId": 21, "episode": 1, "audio": "sub", "titleHint": "One Piece" }
```

Response:

```json
{
  "sources": [
    {
      "url": "https://cdn.example.com/ep1/1080/index.m3u8",
      "referer": "https://watch.example.com/",
      "label": "1080p",
      "quality": "1080p",
      "audio": "AAC 2.0 · SUB",
      "qualityRating": "FHD"
    }
  ]
}
```

A 1.0 server that returns only `url` and `label` is still valid. The phone plays it and shows no quality badge.

### Built-in and user-added

| | Built-in (Anikoto, Gotaku, Ani.pm) | User-added HTTP extension |
|---|---|---|
| Where it runs | Compiled into the APK | Your HTTPS `POST` |
| How metadata arrives | The resolver reads playlist `RESOLUTION` / `CODECS` / `CHANNELS`, or the site’s own quality label | You set `quality`, `audio`, `qualityRating` on each source |
| When a field is unknown | The field is left out | Leave the field out |
| Install | Always present | Extension Store, from `anikitty-extension.json` |

Both paths use the same source model in the app. Badges appear only for fields that are present.

### Errors

Any non-2xx. Preferred body:

```json
{ "error": "Episode not found" }
```

## Timeouts (client)

Typical AniKitty client budgets:

- Connect ~8s, read ~20s, overall call ~30s per resolve.

## Versioning

- Manifest `apiVersion` stays the integer **1**. Clients reject a manifest whose `apiVersion` they do not know. Protocol 1.1 does not change it, so a 1.0 client still installs a 1.1 extension.
- This document’s version is **1.1**. Additive optional response fields bump the document minor version and are listed in the changelog. A breaking request or response change bumps `apiVersion` and the document major version together.
- `version` in the manifest is the extension’s own semver, shown in the store. It is not the protocol version.

## Field reference

| Field | Type | Allowed values | Default when omitted |
|---|---|---|---|
| `anilistId` | number | integer > 0 | required |
| `episode` | number | integer > 0 | required |
| `audio` | string | `"sub"` or `"dub"` | required |
| `titleHint` | string or null | free text | omitted |
| `sources` | array | one or more objects | empty array is an error |
| `sources[].url` | string | absolute `http` or `https` | required; entry dropped if blank |
| `sources[].headers` | object of strings | any header name | none |
| `sources[].referer` | string | absolute URL | not set |
| `sources[].origin` | string | absolute URL | not set |
| `sources[].label` | string | sheet name, often `"1080p"` or `"Auto · SUB"` | `"Stream"` |
| `sources[].quality` | string | size the source stated: `"480p"`, `"720p"`, `"1080p"`, `"4K"`, or another short label | no picture badge |
| `sources[].audio` | string | what the source stated: `"SUB"`, `"DUB"`, `"AAC 2.0 · SUB"`, `"AC3 5.1 · DUB"` | no audio badge |
| `sources[].qualityRating` | string | grade the source stated: `"SD"`, `"HD"`, `"FHD"`, `"UHD"`, `"HQ"` | no grade badge |
| `sources[].stripBytes` | number | `0` or a positive byte count | `0` |
| `sources[].subtitles` | array | `{ url, label, language?, mimeType? }` | none |

Backward compatibility: a 1.0 body with only `url` and `label` is valid. Unknown keys are ignored. Blank strings are treated as omitted. The app never copies `label` into `quality` and never invents `qualityRating` from height.
