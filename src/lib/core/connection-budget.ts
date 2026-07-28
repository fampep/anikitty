/** Prefer stream prefetch only when the network can absorb a second payload. */
export function shouldPrefetchNextStream(): boolean {
  if (typeof navigator === "undefined") return true;
  const nav = navigator as Navigator & {
    connection?: {
      saveData?: boolean;
      effectiveType?: string;
      downlink?: number;
    };
  };
  const c = nav.connection;
  if (!c) return true;
  if (c.saveData) return false;
  if (typeof c.downlink === "number" && c.downlink > 0 && c.downlink < 1.5) return false;
  const type = c.effectiveType;
  if (type === "slow-2g" || type === "2g" || type === "3g") return false;
  return true;
}
