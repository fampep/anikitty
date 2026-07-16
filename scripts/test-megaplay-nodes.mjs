/**
 * Smoke test MegaPlay on all KittyAPI cluster nodes.
 * Run: node --env-file=.env.local scripts/test-megaplay-nodes.mjs
 */

const NODES = [
  { label: "Germany", url: process.env.NEXT_PUBLIC_KITTY_NODE_PRIMARY ?? "https://kittyapi.92-119-165-226.sslip.io" },
  { label: "Sweden", url: process.env.NEXT_PUBLIC_KITTY_NODE_FALLBACK ?? "https://kittyapi.176-125-240-251.sslip.io" },
  { label: "Bulgaria", url: process.env.NEXT_PUBLIC_KITTY_NODE_THIRD ?? "https://kittyapi.131-123-42-153.sslip.io" },
  { label: "Singapore", url: process.env.NEXT_PUBLIC_KITTY_NODE_FOURTH ?? "https://kittyapi.23-111-15-143.sslip.io" },
  { label: "Netherlands", url: process.env.NEXT_PUBLIC_KITTY_NODE_FIFTH ?? "https://kittyapi.94-75-223-124.sslip.io" },
  { label: "Canada", url: process.env.NEXT_PUBLIC_KITTY_NODE_SIXTH ?? "https://kittyapi.184-107-88-54.sslip.io" },
];

const ANILIST_ID = 1535; // Death Note
const EPISODE = 1;
const QUERY = "death note";

function headers() {
  const h = { Accept: "application/json" };
  const key = process.env.KITTY_API_KEY?.trim();
  if (key) h.Authorization = `Bearer ${key}`;
  return h;
}

async function fetchJson(base, path, timeoutMs = 30_000) {
  const url = `${base.replace(/\/$/, "")}${path}`;
  const res = await fetch(url, { headers: headers(), signal: AbortSignal.timeout(timeoutMs) });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text.slice(0, 200) };
  }
  return { ok: res.ok, status: res.status, data };
}

function summarizeStream(data) {
  if (!data || typeof data !== "object") return null;
  const file = data.file ?? data.url;
  const qualities = Array.isArray(data.allServers)
    ? data.allServers.map((s) => s.quality ?? s.name ?? "?").join(", ")
    : null;
  const tracks = Array.isArray(data.tracks) ? data.tracks.length : 0;
  const server = data.server ?? data.serverName ?? null;
  return { file: Boolean(file), qualities, tracks, server };
}

async function testNode(node) {
  const base = node.url;
  const results = { label: node.label, url: base, steps: {} };

  const search = await fetchJson(base, `/provider/MegaPlay/search?q=${encodeURIComponent(QUERY)}`);
  const searchList = Array.isArray(search.data) ? search.data : [];
  const hasAnilistUrl = searchList.some((r) => String(r?.url ?? "").startsWith("anilist:"));
  results.steps.search = search.ok
    ? `ok (${searchList.length} results${hasAnilistUrl ? ", anilist: URLs" : ""})`
    : `fail ${search.status}`;

  const episodes = await fetchJson(
    base,
    `/provider/MegaPlay/episodes?seriesUrl=anilist:${ANILIST_ID}`,
  );
  const epList = Array.isArray(episodes.data)
    ? episodes.data
    : Array.isArray(episodes.data?.episodes)
      ? episodes.data.episodes
      : [];
  results.steps.episodes = episodes.ok ? `ok (${epList.length} eps)` : `fail ${episodes.status}`;

  const ep1 = epList.find((e) => Number(e.number ?? e.episode ?? e.ep) === EPISODE) ?? epList[0];
  let serversOk = false;
  if (ep1?.dataIds) {
    const dataIds =
      typeof ep1.dataIds === "string" ? ep1.dataIds : JSON.stringify(ep1.dataIds);
    const servers = await fetchJson(
      base,
      `/provider/MegaPlay/servers?dataIds=${encodeURIComponent(dataIds)}&audio=sub`,
    );
    const serverList = Array.isArray(servers.data) ? servers.data : [];
    serversOk = servers.ok && serverList.length > 0;
    results.steps.servers = servers.ok ? `ok (${serverList.length} servers)` : `fail ${servers.status}`;

    if (serverList[0]?.id) {
      const stream = await fetchJson(
        base,
        `/provider/MegaPlay/stream?linkId=${encodeURIComponent(serverList[0].id)}`,
      );
      const summary = summarizeStream(stream.data);
      results.steps.stream = stream.ok && summary?.file
        ? `ok (${summary.qualities ?? "no qualities"}, ${summary.tracks} tracks)`
        : `fail ${stream.status}`;
    }
  } else {
    results.steps.servers = "skip (no dataIds)";
    results.steps.stream = "skip";
  }

  const direct = await fetchJson(
    base,
    `/provider/MegaPlay/stream-direct?anilistId=${ANILIST_ID}&episode=${EPISODE}&audio=sub`,
  );
  const directSummary = summarizeStream(direct.data);
  results.steps.streamDirect = direct.ok && directSummary?.file
    ? `ok (${directSummary.qualities ?? "HLS levels"}, ${directSummary.tracks} tracks, server=${directSummary.server ?? "?"})`
    : `fail ${direct.status}`;

  results.pass =
    results.steps.episodes.startsWith("ok") &&
    results.steps.streamDirect.startsWith("ok");

  return results;
}

async function main() {
  console.log("=== MegaPlay node test ===\n");
  console.log(`KITTY_API_KEY: ${process.env.KITTY_API_KEY ? "set" : "MISSING"}`);
  console.log(`AniList ${ANILIST_ID} ep ${EPISODE} · query "${QUERY}"\n`);

  if (!process.env.KITTY_API_KEY) {
    console.error("Set KITTY_API_KEY in .env.local");
    process.exit(1);
  }

  let passed = 0;
  for (const node of NODES) {
    console.log(`--- ${node.label} (${node.url}) ---`);
    try {
      const r = await testNode(node);
      for (const [step, status] of Object.entries(r.steps)) {
        console.log(`  ${step}: ${status}`);
      }
      console.log(`  => ${r.pass ? "PASS" : "FAIL"}\n`);
      if (r.pass) passed += 1;
    } catch (e) {
      console.log(`  ERROR: ${e instanceof Error ? e.message : e}\n`);
    }
  }

  console.log(`Result: ${passed}/${NODES.length} nodes passed`);
  process.exit(passed === NODES.length ? 0 : 1);
}

main();
