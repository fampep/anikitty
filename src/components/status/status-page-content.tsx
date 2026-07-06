"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Container from "@/components/layout/container";
import { KITTY_API_NODES, type KittyApiNodeId } from "@/lib/kitty/kitty-api-nodes";
import { useKittyNodePing } from "@/hooks/use-kitty-node-ping";
import { useIntervalWhenVisible } from "@/hooks/use-interval-when-visible";
import { usePollingIntervalMs } from "@/hooks/use-polling-interval-ms";
import { useSettingsStore } from "@/store/settings-store";
import { ROUTES } from "@/constants/routes";
import { DISCORD_INVITE_URL } from "@/constants/site-meta";
import { cn } from "@/lib/core/utils";
import { useT } from "@/providers/i18n-provider";
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Globe2,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { DiscordIcon } from "@/components/auth/discord-connect";

type OverallStatus = "operational" | "degraded" | "outage" | "checking";

function resolveOverallStatus(
  loading: boolean,
  ready: boolean,
  nodes: { ok: boolean }[],
): OverallStatus {
  if (loading || !ready) return "checking";
  const online = nodes.filter((n) => n.ok).length;
  if (online === 0) return "outage";
  if (online < nodes.length) return "degraded";
  return "operational";
}

const STATUS_META: Record<
  Exclude<OverallStatus, "checking">,
  { icon: typeof CheckCircle2; color: string; bg: string }
> = {
  operational: {
    icon: CheckCircle2,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10 border-emerald-500/25",
  },
  degraded: {
    icon: AlertTriangle,
    color: "text-amber-400",
    bg: "bg-amber-500/10 border-amber-500/25",
  },
  outage: {
    icon: XCircle,
    color: "text-red-400",
    bg: "bg-red-500/10 border-red-500/25",
  },
};

// Flag per cluster node for a quicker read than a generic globe.
const NODE_FLAGS: Record<string, string> = {
  primary: "🇨🇭",
  fallback: "🇸🇪",
  "third-choice": "🇧🇬",
  "fourth-choice": "🇸🇬",
};

/** Color-code latency: green good, amber okay, red slow. */
function latencyClass(ms: number | null | undefined): string {
  if (ms == null) return "text-muted-foreground/60 dark:text-white/25";
  if (ms < 120) return "text-emerald-400";
  if (ms < 280) return "text-amber-400";
  return "text-rose-400";
}

export default function StatusPageContent() {
  const t = useT();
  const liteMode = useSettingsStore((s) => s.liteMode);
  const selectedNode = useSettingsStore((s) => s.kittyProxyNode);
  const manualNode = useSettingsStore((s) => s.kittyProxyManual);
  const statusPollMs = usePollingIntervalMs("status");
  const { nodes, pingByNode, bandwidthByNode, fastestId, recommended, ready, loading, refresh } =
    useKittyNodePing();
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  useEffect(() => {
    if (ready && !loading) setLastRefresh(new Date());
  }, [ready, loading, nodes]);

  const handleRefresh = useCallback(() => {
    refresh();
  }, [refresh]);

  useIntervalWhenVisible(handleRefresh, statusPollMs, !liteMode && statusPollMs > 0);

  const overall = useMemo(
    () => resolveOverallStatus(loading, ready, nodes),
    [loading, ready, nodes],
  );

  const onlineCount = nodes.filter((n) => n.ok).length;
  const fastestNode = KITTY_API_NODES.find((n) => n.id === (recommended ?? fastestId));
  const fastestPing = fastestNode ? pingByNode[fastestNode.id as KittyApiNodeId] : null;

  const overallLabel =
    overall === "checking"
      ? t("status.checking")
      : t(`status.overall.${overall}`);

  const OverallIcon =
    overall === "checking"
      ? Loader2
      : STATUS_META[overall].icon;

  return (
    <Container className="py-10 sm:py-14 pb-20">
      <div className="max-w-3xl mx-auto flex flex-col gap-8">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-indigo-400/80">
            <Activity className="w-4 h-4" />
            <span className="text-[11px] font-mono uppercase tracking-widest">
              {t("status.eyebrow")}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground dark:text-white">
            {t("status.title")}
          </h1>
          <p className="text-sm text-muted-foreground dark:text-white/45 leading-relaxed max-w-xl">
            {t("status.subtitle")}
          </p>
        </div>

        <div
          className={cn(
            "site-panel p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4",
            overall !== "checking" && STATUS_META[overall].bg,
          )}
        >
          <div className="flex items-center gap-3">
            <OverallIcon
              className={cn(
                "w-8 h-8 shrink-0",
                overall === "checking" && "animate-spin text-muted-foreground",
                overall !== "checking" && STATUS_META[overall].color,
              )}
            />
            <div>
              <p className="text-lg font-semibold text-foreground dark:text-white">{overallLabel}</p>
              {ready && (
                <p className="text-[12px] text-muted-foreground dark:text-white/50 mt-0.5">
                  {t("status.nodesOnline", { online: onlineCount, total: nodes.length })}
                  {fastestNode && fastestPing != null && (
                    <>
                      {" · "}
                      {t("status.fastest")}: {NODE_FLAGS[fastestNode.id] ?? ""} {fastestNode.location} ({fastestPing}ms)
                    </>
                  )}
                </p>
              )}
              <p className="text-[12px] text-muted-foreground dark:text-white/40 mt-0.5">
                {lastRefresh
                  ? t("status.lastChecked", { time: lastRefresh.toLocaleTimeString() })
                  : liteMode
                    ? t("status.manualRefreshLite")
                    : t("status.autoRefresh")}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-border dark:border-white/12 text-sm font-medium text-muted-foreground dark:text-white/60 hover:bg-accent dark:hover:bg-white/8 transition-colors disabled:opacity-40"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            {t("status.refresh")}
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <p className="text-[10px] font-mono text-muted-foreground/80 dark:text-white/25 uppercase tracking-widest">
            {t("status.proxyNodes")}
          </p>
          {KITTY_API_NODES.map((node) => {
            const ping = pingByNode[node.id as KittyApiNodeId];
            const bandwidth = bandwidthByNode[node.id as KittyApiNodeId];
            const online = nodes.find((n) => n.id === node.id)?.ok ?? false;
            const isRecommended = (recommended ?? fastestId) === node.id && online;

            return (
              <div
                key={node.id}
                className={cn(
                  "site-panel p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4",
                  !online && "opacity-80",
                )}
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div
                    className={cn(
                      "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 text-lg leading-none",
                      online
                        ? "bg-emerald-500/10 ring-emerald-500/20"
                        : "bg-red-500/10 ring-red-500/20 grayscale opacity-70",
                    )}
                  >
                    {NODE_FLAGS[node.id] ?? <Globe2 className="w-4 h-4 text-muted-foreground" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-foreground dark:text-white/90">
                        {node.location}
                      </p>
                      {isRecommended && (
                        <span className="text-[9px] font-mono uppercase tracking-wide px-1.5 py-0.5 rounded bg-teal-500/15 border border-teal-400/25 text-teal-300/90">
                          {t("status.recommended")}
                        </span>
                      )}
                      {manualNode && selectedNode === node.id && (
                        <span className="text-[9px] font-mono uppercase tracking-wide px-1.5 py-0.5 rounded bg-violet-500/15 border border-violet-400/25 text-violet-300/90">
                          {t("status.yourNode")}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground/80 dark:text-white/25 mt-1.5">
                      {online ? t("status.nodeOnline") : t("status.nodeOffline")}
                      {ping != null && (
                        <>
                          {" · "}
                          <span className={cn("font-medium", latencyClass(ping))}>
                            {t("status.latency", { ms: ping })}
                          </span>
                        </>
                      )}
                      {bandwidth != null && bandwidth > 0 && (
                        <>
                          {" · "}
                          {t("status.bandwidth", { mbps: bandwidth >= 10 ? Math.round(bandwidth) : bandwidth.toFixed(1) })}
                        </>
                      )}
                    </p>
                  </div>
                </div>
                <div
                  className={cn(
                    "shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-mono border",
                    online
                      ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300/90"
                      : "border-red-500/25 bg-red-500/10 text-red-300/90",
                  )}
                >
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      online ? "bg-emerald-400" : "bg-red-400",
                    )}
                  />
                  {online ? t("status.up") : t("status.down")}
                </div>
              </div>
            );
          })}
        </div>

        <div className="site-panel p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground dark:text-white/90">
              {t("status.discordTitle")}
            </p>
            <p className="text-[13px] text-muted-foreground dark:text-white/45 mt-1 leading-relaxed">
              {t("status.discordBody")}
            </p>
          </div>
          <a
            href={DISCORD_INVITE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-white text-sm font-semibold transition-colors shrink-0"
          >
            <DiscordIcon className="w-4 h-4" />
            {t("discordPrompt.joinDiscord")}
            <ExternalLink className="w-3.5 h-3.5 opacity-70" />
          </a>
        </div>

        <p className="text-center text-[11px] text-muted-foreground/70 dark:text-white/25 font-mono">
          <Link href={ROUTES.FAQ} className="hover:text-foreground dark:hover:text-white/60 transition-colors">
            {t("status.faqLink")}
          </Link>
        </p>
      </div>
    </Container>
  );
}
