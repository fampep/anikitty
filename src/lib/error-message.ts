/** Extract a user-visible message from thrown errors, API failures, or strings. */
export function getErrorMessage(error: unknown): string | undefined {
  if (error == null) return undefined;
  if (typeof error === "string") {
    const trimmed = error.trim();
    return trimmed || undefined;
  }
  if (error instanceof Error) {
    const msg = error.message?.trim();
    if (msg) return msg;
  }
  if (typeof error === "object") {
    const record = error as {
      message?: string;
      error?: string;
      response?: { data?: { error?: string; message?: string } };
    };
    const fromBody =
      record.response?.data?.error?.trim() ||
      record.response?.data?.message?.trim() ||
      record.error?.trim();
    if (fromBody) return fromBody;
    const msg = record.message?.trim();
    if (msg) return msg;
  }
  return undefined;
}
