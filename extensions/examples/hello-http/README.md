# Hello HTTP (example extension)

Copy this folder into your own GitHub repo.

1. Edit `anikitty-extension.json` — set `id`, `name`, and especially `baseUrl`.
2. Implement `POST /v1/resolve` per [../../spec/PROTOCOL.md](../../spec/PROTOCOL.md).
3. Paste `https://github.com/<you>/<repo>` into AniKitty → Account → Extensions.

Pseudo-handler:

```js
app.post('/v1/resolve', async (req, res) => {
  const { anilistId, episode, audio } = req.body;
  // …map to CDN…
  res.json({
    sources: [{
      url: 'https://cdn.example.com/master.m3u8',
      headers: { Referer: 'https://watch.example.com/' },
      label: '1080p',
    }],
  });
});
```
