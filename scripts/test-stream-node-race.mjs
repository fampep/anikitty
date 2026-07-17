/**
 * Verify parallel stream-direct race across remaining KittyAPI nodes.
 * Run: node --env-file=.env.local scripts/test-stream-node-race.mjs
 */

const NODES = [
  { id: "primary", label: "Sweden", url: process.env.NEXT_PUBLIC_KITTY_NODE_PRIMARY ?? "https://kittyapi.176-125-240-251.sslip.io" },
  { id: "third-choice", label: "Bulgaria", url: process.env.NEXT_PUBLIC_KITTY_NODE_THIRD ?? "https://kittyapi.131-123-42-153.sslip.io" },
  { id: "fourth-choice", label: "Singapore", url: process.env.NEXT_PUBLIC_KITTY_NODE_FOURTH ?? "https://kittyapi.23-111-15-143.sslip.io" },
  { id: "fifth-choice", label: "Canada", url: process.env.NEXT_PUBLIC_KITTY_NODE_FIFTH ?? "https://kittyapi.184-107-88-54.sslip.io" },
];

const ANILIST_ID = 1535; // Death Note
const EPISODE = 1;
const PROVIDER = process.env.RACE_PROVIDER || "MegaPlay";

function headers() {
  const h = { Accept: "application/json" };
  const key = process.env.KITTY_API_KEY?.trim();
  if (key) h.Authorization = `Bearer ${key}`;
  return h;
}

async function probeNode(node) {
  const path = `/provider/${encodeURIComponent(PROVIDER)}/stream-direct?anilistId=${ANILIST_ID}&episode=${EPISODE}&audio=sub&title=Death%20Note`;
  const url = `${node.url.replace(/\/$/, "")}${path}`;
  const started = Date.now();
  try {
    const res = await fetch(url, {
      headers: headers(),
      signal: AbortSignal.timeout(25_000),
    });
    const data = await res.json().catch(() => null);
    const file = data?.file || data?.url || null;
    return {
      id: node.id,
      label: node.label,
      ms: Date.now() - started,
      ok: res.ok && Boolean(file),
      status: res.status,
      hasFile: Boolean(file),
    };
  } catch (err) {
    return {
      id: node.id,
      label: node.label,
      ms: Date.now() - started,
      ok: false,
      status: 0,
      hasFile: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

console.log(`Racing ${PROVIDER} ep${EPISODE} across ${NODES.length} nodes…\n`);

const started = Date.now();
const results = await Promise.all(NODES.map(probeNode));
const winner = results
  .filter((r) => r.ok)
  .sort((a, b) => a.ms - b.ms)[0];

for (const r of results) {
  const mark = r.ok ? "OK " : "FAIL";
  console.log(
    `${mark.padEnd(4)} ${(r.label || r.id).padEnd(12)} ${String(r.ms).padStart(5)}ms  status=${r.status} file=${r.hasFile}${r.error ? `  ${r.error}` : ""}`,
  );
}

console.log(`\nWall clock: ${Date.now() - started}ms`);
if (winner) {
  console.log(`Winner (first valid): ${winner.label} (${winner.id}) in ${winner.ms}ms`);
  process.exit(0);
} else {
  console.error("No node returned a working stream.");
  process.exit(1);
}
