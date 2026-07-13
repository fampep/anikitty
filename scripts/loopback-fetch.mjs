import http from "node:http";

function runtimePort() {
  return Number(process.env.PORT?.trim() || "3000");
}

function candidatePorts() {
  const primary = runtimePort();
  const ports = [primary, 80, 3000];
  return [...new Set(ports)];
}

/**
 * HTTP request to 127.0.0.1 — bypasses fetch/undici proxy env (HTTPS_PROXY → 0.0.0.0:443).
 */
export function loopbackRequest(path, { method = "GET", headers = {}, body, timeoutMs = 12_000, port } = {}) {
  const payload = body == null ? null : typeof body === "string" ? body : JSON.stringify(body);

  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port: port ?? runtimePort(),
        path,
        method,
        headers: payload
          ? {
              "Content-Type": "application/json",
              "Content-Length": Buffer.byteLength(payload),
              ...headers,
            }
          : headers,
        family: 4,
      },
      (res) => {
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8");
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode ?? 0,
            text,
            json: () => {
              try {
                return JSON.parse(text || "{}");
              } catch {
                return {};
              }
            },
          });
        });
      },
    );

    req.on("error", reject);
    req.setTimeout(timeoutMs, () => req.destroy(new Error("loopback request timeout")));
    if (payload) req.write(payload);
    req.end();
  });
}

/** Probe /api/health on common local ports. Returns working base URL or null. */
export async function probeLoopbackHealth({ timeoutMs = 4000 } = {}) {
  for (const port of candidatePorts()) {
    try {
      const res = await loopbackRequest("/api/health", { timeoutMs, port });
      if (res.ok) return `http://127.0.0.1:${port}`;
    } catch {
      // try next port
    }
  }
  return null;
}

/** POST JSON to an internal API path on loopback. */
export async function loopbackPost(path, body, { headers = {}, timeoutMs = 12_000, port } = {}) {
  return loopbackRequest(path, { method: "POST", body, headers, timeoutMs, port });
}

/** GET from an internal API path on loopback. */
export async function loopbackGet(path, { headers = {}, timeoutMs = 12_000, port } = {}) {
  return loopbackRequest(path, { method: "GET", headers, timeoutMs, port });
}

export function loopbackPortFromBase(base) {
  try {
    const url = new URL(base);
    return Number(url.port || runtimePort());
  } catch {
    return runtimePort();
  }
}
