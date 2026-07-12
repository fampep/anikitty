"use client";

import React from "react";
import { cn } from "@/lib/core/utils";
import { KITTY_API_NODES } from "@/lib/kitty/kitty-api-nodes";
import { useSettingsStore } from "@/store/settings-store";
import { useKittyNodePing } from "@/hooks/use-kitty-node-ping";
import { useT } from "@/providers/i18n-provider";
import { Globe2, Loader2, Zap } from "lucide-react";

function formatMbps(mbps: number): string | number {
  return mbps >= 10 ? Math.round(mbps) : mbps.toFixed(1);
}

function formatPing(
  pingMs: number | null | undefined,
  bandwidthMbps: number | null | undefined,
  loading: boolean,
  t: (key: string, vars?: Record<string, string | number>) => string,
) {
  if (loading && pingMs == null) return t("watch.playerSettings.proxyPingLoading");
  if (pingMs == null) return t("watch.playerSettings.proxyPingUnavailable");
  if (bandwidthMbps != null && bandwidthMbps > 0) {
    return t("watch.playerSettings.proxyPingStats", {
      ms: pingMs,
      mbps: formatMbps(bandwidthMbps),
    });
  }
  return t("watch.playerSettings.proxyPingMs", { ms: pingMs });
}

export default function KittyProxyChooser() {
  const t = useT();
  const kittyProxyNode = useSettingsStore((s) => s.kittyProxyNode);
  const kittyProxyManual = useSettingsStore((s) => s.kittyProxyManual);
  const selectKittyProxyNode = useSettingsStore((s) => s.selectKittyProxyNode);
  const { pingByNode, bandwidthByNode, fastestId, loading } = useKittyNodePing({
    lightweight: false,
  });

  const fasterAvailable =
    kittyProxyManual &&
    fastestId != null &&
    fastestId !== kittyProxyNode &&
    pingByNode[fastestId] != null;

  return (
    <div className="rounded-xl border border-border dark:border-white/[0.08] bg-black/20 px-3 py-3 space-y-2.5">
      <div className="flex items-center gap-2">
        <Globe2 className="w-3.5 h-3.5 text-sky-400/80 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold text-foreground/85 dark:text-white/75">{t("watch.playerSettings.proxyChooser")}</p>
          <p className="text-[10px] text-muted-foreground dark:text-white/30 mt-0.5 leading-snug">
            {kittyProxyManual
              ? t("watch.playerSettings.proxyChooserManual")
              : t("watch.playerSettings.proxyChooserAuto")}
          </p>
        </div>
        {loading && !fastestId ? (
          <Loader2 className="w-3.5 h-3.5 text-muted-foreground/80 dark:text-white/25 animate-spin shrink-0" />
        ) : null}
      </div>

      {fasterAvailable ? (
        <button
          type="button"
          onClick={() => selectKittyProxyNode(fastestId!)}
          className="flex w-full items-center gap-2 rounded-lg border border-teal-400/25 bg-teal-500/10 px-2.5 py-2 text-left transition-colors hover:bg-teal-500/15"
        >
          <Zap className="h-3.5 w-3.5 shrink-0 text-teal-300/85" />
          <span className="min-w-0 flex-1 text-[11px] font-medium text-teal-100/90 truncate">
            {t("watch.playerSettings.proxyFasterAvailable")}
          </span>
          <span className="shrink-0 rounded-md bg-teal-500/20 px-2 py-0.5 text-[10px] font-semibold text-teal-100">
            {t("watch.playerSettings.proxySwitchFastest")}
          </span>
        </button>
      ) : null}

      <div className="grid gap-2 sm:grid-cols-3">
        {KITTY_API_NODES.map((node) => {
          const selected = kittyProxyNode === node.id;
          const pingMs = pingByNode[node.id];
          const bandwidthMbps = bandwidthByNode[node.id];
          const isFastest = fastestId === node.id && pingMs != null;

          return (
            <button
              key={node.id}
              type="button"
              onClick={() => selectKittyProxyNode(node.id)}
              className={cn(
                "rounded-xl border px-3 py-2.5 text-left transition-colors",
                selected
                  ? "border-sky-400/35 bg-sky-500/10 ring-1 ring-sky-400/20"
                  : "border-border dark:border-white/[0.08] bg-muted/40 dark:bg-white/[0.03] hover:border-border dark:border-white/14 hover:bg-muted/60 dark:bg-white/[0.05]",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <p className={cn("text-[12px] font-medium min-w-0", selected ? "text-foreground dark:text-white/90" : "text-muted-foreground dark:text-white/65")}>
                  {node.location}
                </p>
                {isFastest ? (
                  <span className="shrink-0 px-1.5 py-0.5 rounded text-[8px] font-mono uppercase tracking-wide bg-teal-500/15 border border-teal-400/25 text-teal-300/85">
                    {t("watch.playerSettings.proxyFastest")}
                  </span>
                ) : null}
              </div>
              <p
                className={cn(
                  "text-[10px] font-mono mt-1",
                  pingMs != null ? "text-muted-foreground dark:text-white/40" : "text-muted-foreground/80 dark:text-white/25",
                )}
              >
                {formatPing(pingMs, bandwidthMbps, loading, t)}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
