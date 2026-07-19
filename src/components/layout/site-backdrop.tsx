"use client";

import { useEffect, useMemo, useState } from "react";
import { useBackdropStore } from "@/store/backdrop-store";
import { useSettingsStore } from "@/store/settings-store";
import { isCinemaSurface } from "@/lib/core/site-surface";
import { cn } from "@/lib/core/utils";

const ROTATE_MS = 14000;
const FADE_MS = 900;

export default function SiteBackdrop() {
  const surface = useSettingsStore((s) => s.siteSurfaceTheme);
  const liteMode = useSettingsStore((s) => s.liteMode);
  const overrideUrl = useBackdropStore((s) => s.overrideUrl);
  const cinema = isCinemaSurface(surface);

  const [pool, setPool] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const [layerA, setLayerA] = useState<string | null>(null);
  const [layerB, setLayerB] = useState<string | null>(null);
  const [showA, setShowA] = useState(true);

  useEffect(() => {
    if (!cinema) {
      setPool([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/home/backdrops");
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { backdrops?: string[] };
        const urls = (data.backdrops ?? []).filter((u) => typeof u === "string" && u.length > 0);
        if (!cancelled) setPool(urls);
      } catch {
        /* rotator falls back to gradient */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [cinema]);

  const targetUrl = useMemo(() => {
    if (!cinema) return null;
    if (overrideUrl) return overrideUrl;
    if (pool.length === 0) return null;
    return pool[index % pool.length] ?? pool[0] ?? null;
  }, [cinema, overrideUrl, pool, index]);

  useEffect(() => {
    if (!cinema || overrideUrl || pool.length < 2 || liteMode) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % pool.length);
    }, ROTATE_MS);
    return () => window.clearInterval(id);
  }, [cinema, overrideUrl, pool.length, liteMode]);

  useEffect(() => {
    if (!targetUrl) {
      setLayerA(null);
      setLayerB(null);
      return;
    }

    const current = showA ? layerA : layerB;
    if (current === targetUrl) return;

    if (!current) {
      setLayerA(targetUrl);
      setShowA(true);
      return;
    }

    if (liteMode) {
      setLayerA(targetUrl);
      setLayerB(null);
      setShowA(true);
      return;
    }

    if (showA) {
      setLayerB(targetUrl);
      requestAnimationFrame(() => setShowA(false));
    } else {
      setLayerA(targetUrl);
      requestAnimationFrame(() => setShowA(true));
    }
  }, [targetUrl, liteMode]); // eslint-disable-line react-hooks/exhaustive-deps -- crossfade driven by target only

  // Prefetch the next rotator image
  useEffect(() => {
    if (!cinema || overrideUrl || pool.length < 2) return;
    const next = pool[(index + 1) % pool.length];
    if (!next) return;
    const img = new Image();
    img.src = next;
  }, [cinema, overrideUrl, pool, index]);

  if (!cinema) return null;

  return (
    <div
      className="site-backdrop pointer-events-none fixed inset-0 z-0 overflow-hidden"
      aria-hidden
    >
      <div
        className={cn(
          "site-backdrop-layer absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity ease-out",
          showA ? "opacity-100" : "opacity-0",
        )}
        style={{
          backgroundImage: layerA ? `url(${layerA})` : undefined,
          transitionDuration: liteMode ? "0ms" : `${FADE_MS}ms`,
        }}
      />
      <div
        className={cn(
          "site-backdrop-layer absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity ease-out",
          showA ? "opacity-0" : "opacity-100",
        )}
        style={{
          backgroundImage: layerB ? `url(${layerB})` : undefined,
          transitionDuration: liteMode ? "0ms" : `${FADE_MS}ms`,
        }}
      />
      <div className="site-backdrop-scrim absolute inset-0" />
    </div>
  );
}
