/** Never return raw driver / stack messages to clients. */
export function publicErrorMessage(
  err: unknown,
  fallback = "Something went wrong. Please try again.",
): string {
  if (!err) return fallback;
  if (typeof err === "string") {
    if (looksSensitive(err)) return fallback;
    return err.length > 180 ? fallback : err;
  }
  if (err instanceof Error) {
    const msg = err.message || "";
    if (looksSensitive(msg)) return fallback;
    // Allow short, intentional domain errors (e.g. "Unauthorized").
    if (msg.length > 0 && msg.length <= 120 && !/[A-Za-z]:\\|\.ts:\d+|postgres|ECONN/i.test(msg)) {
      return msg;
    }
  }
  return fallback;
}

function looksSensitive(msg: string): boolean {
  const lower = msg.toLowerCase();
  return (
    lower.includes("database_url") ||
    lower.includes("postgres://") ||
    lower.includes("postgresql://") ||
    lower.includes("mongodb://") ||
    lower.includes("redis://") ||
    lower.includes("password") ||
    lower.includes("connection string") ||
    lower.includes("econnrefused") ||
    lower.includes("enotfound") ||
    lower.includes("neon.tech") ||
    lower.includes("supabase") ||
    /\bhost[=:]\s*\S+/i.test(msg) ||
    /at\s+\S+\s+\(/.test(msg)
  );
}
