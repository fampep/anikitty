const REACT_ERROR_MESSAGES: Record<number, string> = {
  185: "Maximum update depth exceeded — a component is stuck in an infinite re-render loop.",
  310: "Rendered more hooks than during the previous render.",
  321: "Invalid hook call. Hooks can only be called inside function components.",
  400: "Too many re-renders. React limits renders to prevent an infinite loop.",
};

/** Turn minified production errors (e.g. React #185) into readable text. */
export function getErrorMessage(error: Error & { digest?: string }): string {
  const raw = error?.message?.trim();
  if (!raw) return error.digest ?? "Unknown error";

  const reactMatch = raw.match(/(?:React error|Minified React error) #(\d+)/i);
  if (reactMatch) {
    const code = Number(reactMatch[1]);
    const known = REACT_ERROR_MESSAGES[code];
    if (known) return known;
    return `React error #${code}`;
  }

  if (raw.includes("Maximum update depth exceeded")) {
    return REACT_ERROR_MESSAGES[185];
  }

  return raw;
}
