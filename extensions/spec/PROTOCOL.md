# AniKitty extension protocol — apiVersion 1

## Roles

| Component | Responsibility |
|---|---|
| AniKitty APK | Auth VPS, AniList browse, Media3 + Chromecast playback |
| Extension HTTP service | Map AniList → playable URL(s) + request headers |
| Manifest (GitHub) | Discoverability + install metadata |

## Manifest discovery

Primary file: `anikitty-extension.json` (repo root).

Required fields: `apiVersion`, `id`, `name`, `version`, `baseUrl`.  
Optional: `description`, `author`, `homepage`, `resolvePath`, `iconUrl`, `nsfw`.

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
    label?: string;                       // quality / source name
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
- Empty `sources` → client treats as failure.

### Errors

Any non-2xx. Preferred body:

```json
{ "error": "Episode not found" }
```

## Timeouts (client)

Typical AniKitty client budgets:

- Connect ~8s, read ~20s, overall call ~30s per resolve.

## Versioning

- `apiVersion` is the **protocol** version (integer). Incompatible changes bump it.
- `version` is the **extension** semver string for humans / store UI.
- Clients reject manifests with unknown / unsupported `apiVersion`.
