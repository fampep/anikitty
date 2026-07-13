import { loopbackPortFromBase, probeLoopbackHealth } from "./loopback-fetch.mjs";

function runtimePort() {
  return process.env.PORT?.trim() || "3000";
}

function loopbackBase(port = runtimePort()) {
  return `http://127.0.0.1:${port}`;
}

/** Base URL for server-to-server calls from the same container (bot → Next API). */
export function internalApiBase() {
  const explicit = process.env.INTERNAL_API_URL?.trim();
  if (explicit) {
    try {
      const url = new URL(explicit);
      if (url.protocol === "http:" && ["127.0.0.1", "localhost", "::1"].includes(url.hostname)) {
        return `http://127.0.0.1:${url.port || runtimePort()}`;
      }
    } catch {
      // fall through
    }
    console.warn(
      `[internal-api] ignoring INTERNAL_API_URL=${explicit} — using loopback http://127.0.0.1:${runtimePort()}`,
    );
  }
  return loopbackBase();
}

/** Probe /api/health via direct loopback HTTP (no fetch/proxy). */
export async function resolveInternalApiBase(options) {
  return probeLoopbackHealth(options);
}

export function getLoopbackPort() {
  return loopbackPortFromBase(internalApiBase());
}
