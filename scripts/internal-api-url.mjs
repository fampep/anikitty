/** Base URL for server-to-server calls from the same container (bot → Next API). */
export function internalApiBase() {
  const explicit = process.env.INTERNAL_API_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");

  const port = process.env.PORT ?? "3000";
  // Never use NEXT_PUBLIC_APP_URL here — from inside Docker that often fails (hairpin NAT).
  return `http://127.0.0.1:${port}`;
}
