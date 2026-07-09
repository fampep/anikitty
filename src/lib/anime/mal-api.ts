import { getMalClientId } from "@/lib/oauth/mal-oauth";

export const MAL_API_BASE = "https://api.myanimelist.net/v2";
export const MAL_WEB_BASE = "https://myanimelist.net";

const MAL_USER_AGENT = "Anikitty/1.0";

function requestSignal(ms: number, init?: RequestInit): AbortSignal | undefined {
  if (init?.signal) return init.signal;
  try {
    return AbortSignal.timeout(ms);
  } catch {
    return undefined;
  }
}

export function malApiHeaders(): Record<string, string> {
  const clientId = getMalClientId();
  return clientId ? { "X-MAL-CLIENT-ID": clientId } : {};
}

export async function malApiGet(
  path: string,
  init?: RequestInit & { revalidate?: number },
): Promise<Response> {
  const { revalidate = 86400, ...rest } = init ?? {};
  return fetch(`${MAL_API_BASE}${path}`, {
    ...rest,
    headers: {
      Accept: "application/json",
      ...malApiHeaders(),
      ...(rest.headers as Record<string, string> | undefined),
    },
    signal: requestSignal(8000, rest),
    next: { revalidate },
  });
}

export async function malWebGet(
  path: string,
  init?: RequestInit & { revalidate?: number },
): Promise<Response> {
  const { revalidate = 86400, ...rest } = init ?? {};
  return fetch(`${MAL_WEB_BASE}${path}`, {
    ...rest,
    headers: {
      "User-Agent": MAL_USER_AGENT,
      Accept: "text/html",
      ...(rest.headers as Record<string, string> | undefined),
    },
    signal: requestSignal(12000, rest),
    next: { revalidate },
  });
}
