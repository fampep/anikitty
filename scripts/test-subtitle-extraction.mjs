/**
 * Smoke test: Miruro API → subtitle track detection → VTT download.
 * Run: node scripts/test-subtitle-extraction.mjs
 * Optional: node --env-file=.env.local scripts/test-subtitle-extraction.mjs
 */

const KITTY_API = process.env.KITTY_API_BASE ?? "https://kittyapi.176-125-240-251.sslip.io";
const LOCAL_API = process.env.LOCAL_API ?? "http://localhost:3002";
const ANILIST_ID = 1535; // Death Note
const EPISODE = 1;
const PROVIDER = "Miruro";

function kittyHeaders() {
  const headers = {};
  const apiKey = process.env.KITTY_API_KEY;
  if (apiKey) headers["x-api-key"] = apiKey;
  return headers;
}

const NON_SUBTITLE_KINDS = new Set(["thumbnails", "chapters", "metadata"]);

function isSubtitleTrack(track) {
  const file = track.file ?? track.url;
  if (!file?.trim()) return false;
  const kind = (track.kind ?? "subtitles").toLowerCase();
  if (NON_SUBTITLE_KINDS.has(kind)) return false;
  const label = (track.label ?? "").toLowerCase();
  if (
    label.includes("chapter") ||
    label.includes("skip") ||
    label.includes("intro") ||
    label.includes("thumbnail")
  ) {
    return false;
  }
  return kind === "subtitles" || kind === "caption" || kind === "captions" || !track.kind;
}

async function fetchJson(url, headers = {}) {
  const isLocal = url.includes("localhost") || url.includes("127.0.0.1");
  const res = await fetch(url, {
    headers: {
      ...(isLocal ? { "x-anikitty-client": "1" } : {}),
      ...headers,
    },
    signal: AbortSignal.timeout(60_000),
  });
  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}

async function main() {
  console.log("=== Subtitle extraction test ===\n");
  console.log(`Provider: ${PROVIDER} | AniList: ${ANILIST_ID} | Episode: ${EPISODE}`);
  console.log(`KITTY_API_KEY: ${process.env.KITTY_API_KEY ? "set" : "NOT SET"}\n`);

  // Prefer local Next.js proxy (uses server env + our cache/merge logic)
  const localUrl = `${LOCAL_API}/api/kitty/stream?anilistId=${ANILIST_ID}&episode=${EPISODE}&audio=sub&provider=${PROVIDER}`;
  let streamSource = "local";
  let { ok, status, data } = await fetchJson(localUrl).catch(() => ({
    ok: false,
    status: 0,
    data: null,
  }));

  if (!ok || !data?.file) {
    streamSource = "kittyapi";
    const streamUrl = `${KITTY_API}/provider/${PROVIDER}/stream-direct?anilistId=${ANILIST_ID}&episode=${EPISODE}&audio=sub`;
    console.log("1. Local API unavailable — fetching KittyAPI directly...");
    ({ ok, status, data } = await fetchJson(streamUrl, kittyHeaders()));
  } else {
    console.log("1. Fetching stream via local /api/kitty/stream...");
  }

  if (!ok || !data?.file) {
    console.error("FAIL: Stream request failed", { status, error: data?.error ?? data?.message });
    process.exit(1);
  }

  console.log("   OK — stream URL received");
  console.log(`   source: ${streamSource}`);
  console.log(`   matchedTitle: ${data.matchedTitle ?? data.animeTitle ?? "n/a"}`);
  console.log(`   subtitleSource: ${data.subtitleSource ?? "n/a"}`);

  const tracks = Array.isArray(data.tracks) ? data.tracks : [];
  for (const t of tracks) {
    if (!t.file && t.url) t.file = t.url;
  }

  const subTracks = tracks.filter(isSubtitleTrack);
  console.log(`\n2. Subtitle tracks found: ${subTracks.length} / ${tracks.length} total tracks`);

  if (subTracks.length === 0) {
    console.error("FAIL: No subtitle tracks in stream response");
    console.log("   All tracks:", JSON.stringify(tracks, null, 2));
    process.exit(1);
  }

  for (const t of subTracks) {
    console.log(`   - ${t.label ?? "unknown"} (${t.kind ?? "subtitles"})${t.default ? " [default]" : ""}`);
    console.log(`     ${t.file}`);
    if (t.file?.includes("/api/kitty/subtitles")) {
      console.log("     (cached — served from our DB)");
    }
  }

  const headers = data.headers ?? {};
  const fetchHeaders = {
    Accept: "text/vtt,text/plain,*/*",
    "User-Agent":
      headers["User-Agent"] ??
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  };
  if (headers.Referer) fetchHeaders.Referer = headers.Referer;
  if (headers.referer) fetchHeaders.Referer = headers.referer;

  console.log("\n3. Downloading VTT content...");
  let passed = 0;

  for (const t of subTracks) {
    const url = t.file.startsWith("/")
      ? `${LOCAL_API}${t.file}`
      : t.file;
    try {
      const res = await fetch(url, {
        headers: fetchHeaders,
        signal: AbortSignal.timeout(15_000),
      });
      const text = await res.text();
      const isVtt =
        text.trim().startsWith("WEBVTT") ||
        text.includes("-->") ||
        res.headers.get("content-type")?.includes("vtt");

      if (!res.ok) {
        console.log(`   FAIL ${t.label}: HTTP ${res.status}`);
        continue;
      }
      if (!text.trim()) {
        console.log(`   FAIL ${t.label}: empty body`);
        continue;
      }
      if (!isVtt) {
        console.log(`   WARN ${t.label}: may not be VTT (first 80 chars): ${text.slice(0, 80)}`);
      } else {
        const cueCount = (text.match(/-->/g) ?? []).length;
        console.log(`   OK   ${t.label}: ${text.length} bytes, ~${cueCount} cues`);
        passed++;
      }
    } catch (err) {
      console.log(`   FAIL ${t.label}: ${err.message}`);
    }
  }

  console.log("\n4. Miruro /miruro/stream API (direct)...");
  const miruroStream = await fetchJson(
    `${KITTY_API}/miruro/episodes/${ANILIST_ID}`,
    kittyHeaders(),
  );
  const episodes = miruroStream.data?.results?.episodes ?? miruroStream.data?.episodes ?? [];
  const slug = episodes[0]?.slug ?? "1";
  const streamUrl = `${KITTY_API}/miruro/stream?provider=kiwi&anilistId=${ANILIST_ID}&category=sub&slug=${encodeURIComponent(slug)}&quality=1080p`;
  const miruro = await fetchJson(streamUrl, kittyHeaders());
  const miruroSubs = (miruro.data?.results?.subtitles ?? miruro.data?.subtitles ?? []).filter(isSubtitleTrack);
  console.log(`   Miruro API subtitle tracks: ${miruroSubs.length}`);

  console.log("\n=== Summary ===");
  if (passed === subTracks.length) {
    console.log(`PASS — all ${passed} subtitle track(s) downloaded successfully`);
    process.exit(0);
  } else {
    console.log(`PARTIAL — ${passed}/${subTracks.length} tracks downloaded`);
    process.exit(passed > 0 ? 0 : 1);
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
