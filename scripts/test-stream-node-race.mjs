/**
 * Verify parallel stream-direct race across remaining KittyAPI nodes.
 * Mimics production: health prefilter → staggered race → first valid file wins.
 * Run: node --env-file=.env.local scripts/test-stream-node-race.mjs
 */

const NODES = [
  { id: "primary", label: "Sweden", url: process.env.NEXT_PUBLIC_KITTY_NODE_PRIMARY ?? "https://vps.anikitty.online" },
  { id: "third-choice", label: "Bulgaria", url: process.env.NEXT_PUBLIC_KITTY_NODE_THIRD ?? "https://vps.anikitty.online" },
  { id: "fourth-choice", label: "Singapore", url: process.env.NEXT_PUBLIC_KITTY_NODE_FOURTH ?? "https://vps.anikitty.online" },
  { id: "fifth-choice", label: "Netherlands", url: process.env.NEXT_PUBLIC_KITTY_NODE_FIFTH ?? "https://vps.anikitty.online" },
  { id: "sixth-choice", label: "Canada", url: process.env.NEXT_PUBLIC_KITTY_NODE_SIXTH ?? "https://vps.anikitty.online" },
];

const ANILIST_ID = 1535; // Death Note
const EPISODE = 1;
const PROVIDER = process.env.RACE_PROVIDER || "MegaPlay";
const HEALTH_MS = 1_200;
const ATTEMPT_MS = 14_000;
const STAGGER_MS = 75;

function headers() {
  const h = { Accept: "application/json" };
  const key = process.env.KITTY_API_KEY?.trim();
  if (key) h.Authorization = `Bearer ${key}`;
  return h;
}

function isValidWin(data, ok) {
  const file = (data?.file || data?.url || "").trim();
  if (!ok || file.length < 8) return false;
  if (data?.error && !file.includes("/proxy") && !/^https?:\/\//i.test(file)) return false;
  return file.startsWith("/") || /^https?:\/\//i.test(file);
}

async function healthProbe(node) {
  const started = Date.now();
  try {
    const res = await fetch(`${node.url.replace(/\/$/, "")}/health`, {
      headers: headers(),
      signal: AbortSignal.timeout(HEALTH_MS),
    });
    return { id: node.id, ok: res.ok, ms: Date.now() - started };
  } catch (err) {
    return {
      id: node.id,
      ok: false,
      ms: Date.now() - started,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function raceStreamDirect(nodes) {
  const wallStart = Date.now();
  const controllers = nodes.map(() => new AbortController());
  let settled = false;
  let pending = nodes.length;
  const results = [];

  return new Promise((resolve) => {
    const finishNull = () => {
      if (!settled && pending <= 0) {
        settled = true;
        resolve({ winner: null, results, raceMs: Date.now() - wallStart });
      }
    };

    const launch = (node, index) => {
      const controller = controllers[index];
      if (settled || controller.signal.aborted) {
        pending -= 1;
        finishNull();
        return;
      }

      const path = `/provider/${encodeURIComponent(PROVIDER)}/stream-direct?anilistId=${ANILIST_ID}&episode=${EPISODE}&audio=sub&title=Death%20Note`;
      const url = `${node.url.replace(/\/$/, "")}${path}`;
      const started = Date.now();

      const timeout = AbortSignal.timeout(ATTEMPT_MS);
      const signal =
        typeof AbortSignal.any === "function"
          ? AbortSignal.any([controller.signal, timeout])
          : controller.signal;

      fetch(url, { headers: headers(), signal })
        .then(async (res) => {
          const data = await res.json().catch(() => null);
          const ok = isValidWin(data, res.ok);
          const row = {
            id: node.id,
            label: node.label,
            ms: Date.now() - started,
            ok,
            status: res.status,
            hasFile: Boolean(data?.file || data?.url),
          };
          results.push(row);

          if (settled) return;
          if (ok) {
            settled = true;
            for (let i = 0; i < controllers.length; i++) {
              if (i !== index) controllers[i].abort();
            }
            resolve({
              winner: row,
              results,
              raceMs: Date.now() - wallStart,
            });
            return;
          }
          pending -= 1;
          finishNull();
        })
        .catch((err) => {
          results.push({
            id: node.id,
            label: node.label,
            ms: Date.now() - started,
            ok: false,
            status: 0,
            hasFile: false,
            error: err instanceof Error ? err.message : String(err),
          });
          if (settled) return;
          pending -= 1;
          finishNull();
        });
    };

    nodes.forEach((node, index) => {
      if (index === 0) launch(node, index);
      else setTimeout(() => launch(node, index), index * STAGGER_MS);
    });
  });
}

console.log(`Racing ${PROVIDER} ep${EPISODE} across ${NODES.length} nodes…\n`);

const healthStarted = Date.now();
const health = await Promise.all(NODES.map(healthProbe));
console.log(`Health prefilter (${Date.now() - healthStarted}ms):`);
for (const h of health) {
  console.log(`  ${h.ok ? "UP  " : "DOWN"} ${(NODES.find((n) => n.id === h.id)?.label || h.id).padEnd(12)} ${String(h.ms).padStart(5)}ms${h.error ? `  ${h.error}` : ""}`);
}

const healthy = NODES.filter((n) => health.find((h) => h.id === n.id)?.ok);
const racePool = healthy.length > 0 ? healthy : NODES;
console.log(`\nRacing ${racePool.length} node(s) (stagger ${STAGGER_MS}ms, timeout ${ATTEMPT_MS}ms)…\n`);

const { winner, results, raceMs } = await raceStreamDirect(racePool);

for (const r of results.sort((a, b) => a.ms - b.ms)) {
  const mark = r.ok ? "OK " : "FAIL";
  console.log(
    `${mark.padEnd(4)} ${(r.label || r.id).padEnd(12)} ${String(r.ms).padStart(5)}ms  status=${r.status} file=${r.hasFile}${r.error ? `  ${r.error}` : ""}`,
  );
}

console.log(`\nRace wall clock: ${raceMs}ms`);
if (winner) {
  console.log(`Winner (first valid): ${winner.label} (${winner.id}) in ${winner.ms}ms`);
  process.exit(0);
} else {
  console.error("No node returned a working stream.");
  process.exit(1);
}
