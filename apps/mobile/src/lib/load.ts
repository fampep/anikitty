import { useEffect, useRef, useState } from "react";

type LoadState<T> = {
  data: T | undefined;
  error: string | null;
  loading: boolean;
  reload: () => void;
};

export function useLoad<T>(key: string, loader: () => Promise<T>, enabled = true): LoadState<T> {
  const loaderRef = useRef(loader);
  loaderRef.current = loader;
  const [tick, setTick] = useState(0);
  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(enabled);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    loaderRef
      .current()
      .then((value) => {
        if (!cancelled) setData(value);
      })
      .catch((reason: unknown) => {
        if (!cancelled) {
          setData(undefined);
          setError(reason instanceof Error ? reason.message : "Something went wrong");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [key, enabled, tick]);

  return {
    data,
    error,
    loading,
    reload: () => setTick((value) => value + 1),
  };
}

export function plainText(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function withoutAdult<T extends { isAdult?: boolean }>(list: T[] | undefined, allowAdult: boolean): T[] {
  if (!list?.length) return [];
  if (allowAdult) return list;
  return list.filter((item) => !item.isAdult);
}

export function formatAirTime(timestampMs: number): string {
  return new Date(timestampMs).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}
