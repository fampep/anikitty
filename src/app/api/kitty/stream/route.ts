const BASE = "https://kittyapi.buzz";

function normalise(stream: any) {
  if (!stream || typeof stream !== "object") return stream;

  // url alias → file (some providers return url instead of file)
  if (!stream.file && stream.url) stream.file = stream.url;

  // ensure headers object exists
  if (!stream.headers || typeof stream.headers !== "object") stream.headers = {};

  // if Referer is missing, use the stream URL itself as fallback (CLI does the same)
  if (!stream.headers.Referer && !stream.headers.referer && stream.file) {
    stream.headers.Referer = stream.file;
  }

  // normalise subtitle tracks
  if (Array.isArray(stream.tracks)) {
    for (const track of stream.tracks) {
      if (!track.file && track.url) track.file = track.url;
      if (!track.label && track.lang) track.label = track.lang;
    }
  }

  // normalise allServers array
  if (Array.isArray(stream.allServers)) {
    for (const server of stream.allServers) {
      if (!server.file && server.url) server.file = server.url;
      if (!server.quality && server.label) server.quality = server.label;
      // inherit top-level headers if server has none
      if (!server.headers) server.headers = { ...stream.headers };
    }
    // if top-level file is missing, promote first server
    if (!stream.file && stream.allServers[0]?.file) {
      stream.file = stream.allServers[0].file;
      if (stream.allServers[0].headers) {
        stream.headers = { ...stream.allServers[0].headers };
      }
    }
  }

  return stream;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const anilistId = searchParams.get("anilistId");
  const episode   = searchParams.get("episode");
  const audio     = searchParams.get("audio") || "sub";
  const provider  = searchParams.get("provider") || "Miruro";

  if (!anilistId || !episode) {
    return Response.json({ error: "anilistId and episode are required" }, { status: 400 });
  }

  const url = `${BASE}/provider/${encodeURIComponent(provider)}/stream-direct?anilistId=${anilistId}&episode=${episode}&audio=${audio}`;
  const res = await fetch(url, { cache: "no-store" });
  const data = await res.json();
  return Response.json(normalise(data), { status: res.status });
}
