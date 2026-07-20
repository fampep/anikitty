/** Quick Miruro subtitle diagnostic. Run: node --env-file=.env scripts/test-miruro-subs.mjs */
const KITTY = process.env.KITTY_API_BASE ?? "https://vps.anikitty.online";
const LOCAL = process.env.LOCAL_API ?? "http://localhost:3000";
const ANILIST_ID = 1535;
const EP = 1;

function headers(extra = {}) {
  const h = { ...extra };
  if (process.env.KITTY_API_KEY) h["x-api-key"] = process.env.KITTY_API_KEY;
  return h;
}

async function get(url, h = {}) {
  const res = await fetch(url, { headers: h, signal: AbortSignal.timeout(60_000) });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text.slice(0, 400) };
  }
  return { status: res.status, ok: res.ok, json };
}

async function main() {
  console.log("KITTY_API_KEY:", process.env.KITTY_API_KEY ? "set" : "MISSING");
  console.log("DATABASE_URL:", process.env.DATABASE_URL ? "set" : "MISSING");
  console.log();

  const epUrl = `${KITTY}/miruro/episodes/${ANILIST_ID}`;
  console.log("1.", epUrl);
  const epRes = await get(epUrl, headers());
  console.log("   status:", epRes.status);
  const epData = epRes.json?.results ?? epRes.json;
  let slug = String(EP);
  let epCount = 0;

  if (epData?.providers) {
    for (const provider of ["kiwi", "bonk", "ally", "moo", "pew"]) {
      const rows = epData.providers[provider]?.episodes?.sub ?? [];
      if (rows.length === 0) continue;
      epCount = rows.length;
      const ep1 = rows.find((e) => e.number === EP) ?? rows[0];
      const watchId = ep1?.id ?? "";
      slug = watchId.split("/").pop() || slug;
      console.log("   provider:", provider, "| episodes:", epCount);
      console.log("   watchId:", watchId);
      break;
    }
  } else {
    const episodes = Array.isArray(epData)
      ? epData
      : epData?.episodes ?? epData?.results ?? [];
    epCount = episodes.length;
    const ep1 = episodes.find((e) => (e.number ?? e.episode) === EP) ?? episodes[0];
    slug = ep1?.slug ?? slug;
  }

  console.log("   slug for ep", EP + ":", slug);
  if (!epRes.ok) console.log("   body:", JSON.stringify(epRes.json).slice(0, 500));

  console.log();
  const providers = epData?.providers ?? {};
  for (const provider of ["bonk", "ally", "kiwi", "moo"]) {
    const rows = providers[provider]?.episodes?.sub ?? [];
    const epRow = rows.find((e) => e.number === EP) ?? rows[0];
    const providerSlug = epRow?.id?.split("/").pop() ?? slug;
    const streamUrl = `${KITTY}/miruro/stream?provider=${provider}&anilistId=${ANILIST_ID}&category=sub&slug=${encodeURIComponent(providerSlug)}&quality=1080p`;
    console.log("2. stream", provider, "| slug:", providerSlug);
    const s = await get(streamUrl, headers());
    const results = s.json?.results ?? s.json;
    const subs = results?.subtitles ?? results?.tracks ?? [];
    console.log("   status:", s.status, "| subtitles:", Array.isArray(subs) ? subs.length : 0);
    if (Array.isArray(subs) && subs[0]) {
      console.log("   first:", subs[0].label ?? subs[0].name, (subs[0].file ?? subs[0].url ?? "").slice(0, 80));
    } else if (!s.ok) {
      console.log("   error:", JSON.stringify(s.json).slice(0, 300));
    }
  }

  console.log();
  const fetchUrl = `${LOCAL}/api/anime/${ANILIST_ID}/subtitles?episode=${EP}&fetch=1`;
  console.log("3.", fetchUrl);
  const f = await get(fetchUrl, { "x-anikitty-client": "1" });
  const rows = f.json?.data ?? [];
  console.log("   status:", f.status, "| cached tracks:", rows.length);
  rows.slice(0, 3).forEach((r) => console.log("   -", r.label, r.previewUrl));

  console.log();
  const streamUrl = `${LOCAL}/api/kitty/stream?anilistId=${ANILIST_ID}&episode=${EP}&audio=sub&provider=Miruro`;
  console.log("4.", streamUrl);
  const st = await get(streamUrl, { "x-anikitty-client": "1" });
  console.log("   status:", st.status, "| tracks:", st.json?.tracks?.length ?? 0);
  console.log("   subtitleSource:", st.json?.subtitleSource);
  st.json?.tracks?.forEach((t) => console.log("   -", t.label, (t.file ?? "").slice(0, 80)));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
