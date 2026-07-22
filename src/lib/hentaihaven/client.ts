import "server-only";

import { kittyApiFetch } from "@/lib/kitty/kitty-api-server";
import { HH_PROVIDER } from "@/lib/hentaihaven/config";

export async function hhKittyGet<T>(
  action: string,
  params: Record<string, string | number | undefined | null> = {},
): Promise<T> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v == null || v === "") continue;
    qs.set(k, String(v));
  }
  const path = `/provider/${HH_PROVIDER}/${action}${qs.toString() ? `?${qs}` : ""}`;
  const res = await kittyApiFetch(path, { method: "GET" }, { timeoutMs: 25_000 });
  const json = (await res.json().catch(() => null)) as T | { error?: string } | null;
  if (!res.ok) {
    const err =
      json && typeof json === "object" && "error" in json && json.error
        ? String(json.error)
        : `KittyAPI HentaiHaven ${action} failed (${res.status})`;
    throw new Error(err);
  }
  return json as T;
}
