"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Container from "@/components/layout/container";
import { KITTY_API_NODES, PUBLIC_KITTY_API_ORIGIN, type KittyApiNodeId } from "@/lib/kitty/kitty-api-nodes";
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
  Zap,
  Gauge,
  Wifi,
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

/** Flags keyed by location label so node geo changes don’t leave stale country icons. */
const LOCATION_FLAGS: Record<string, string> = {
  Germany: "🇩🇪",
  Sweden: "🇸🇪",
  Switzerland: "🇨🇭",
  "Zug, Switzerland": "🇨🇭",
  Netherlands: "🇳🇱",
  Bulgaria: "🇧🇬",
  Singapore: "🇸🇬",
  Canada: "🇨🇦",
  "Montreal, Canada": "🇨🇦",
};

function flagForLocation(location: string): string | null {
  const exact = LOCATION_FLAGS[location];
  if (exact) return exact;
  const match = Object.entries(LOCATION_FLAGS).find(
    ([key]) => key !== location && location.includes(key),
  );
  return match?.[1] ?? null;
}

function latencyClass(ms: number | null | undefined): string {
  if (ms == null) return "text-muted-foreground/60 dark:text-white/25";
  if (ms < 120) return "text-emerald-400";
  if (ms < 280) return "text-amber-400";
  return "text-rose-400";
}

function formatMbps(mbps: number): string | number {
  return mbps >= 10 ? Math.round(mbps) : mbps.toFixed(1);
}

function latencyBarWidth(ms: number | null, maxMs: number): number {
  if (ms == null || maxMs <= 0) return 0;
  return Math.max(8, Math.min(100, Math.round((ms / maxMs) * 100)));
}

export default function StatusPageContent() {
  const t = useT();
  const liteMode = useSettingsStore((s) => s.liteMode);
  const activeNode = useSettingsStore((s) => s.kittyProxyNode);
  const statusPollMs = usePollingIntervalMs("status");
  const { nodes, pingByNode, bandwidthByNode, fastestId, recommended, ready, loading, refresh } =
    useKittyNodePing({ lightweight: true });
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
  const offlineCount = Math.max(0, nodes.length - onlineCount);
  const fastestNodeId = (recommended ?? fastestId) as KittyApiNodeId | null;
  const fastestNode = KITTY_API_NODES.find((n) => n.id === fastestNodeId);
  const fastestPing = fastestNode ? pingByNode[fastestNode.id] : null;
  const activeMeta = KITTY_API_NODES.find((n) => n.id === activeNode);

  const sortedNodes = useMemo(() => {
    return [...KITTY_API_NODES].sort((a, b) => {
      const aPing = pingByNode[a.id];
      const bPing = pingByNode[b.id];
      const aOk = nodes.find((n) => n.id === a.id)?.ok ?? false;
      const bOk = nodes.find((n) => n.id === b.id)?.ok ?? false;
      if (aOk !== bOk) return aOk ? -1 : 1;
      if (aPing == null && bPing == null) return a.index - b.index;
      if (aPing == null) return 1;
      if (bPing == null) return -1;
      return aPing - bPing;
    });
  }, [pingByNode, nodes]);

  const maxPing = useMemo(() => {
    const values = sortedNodes
      .map((n) => pingByNode[n.id])
      .filter((ms): ms is number => ms != null && ms > 0);
    return values.length ? Math.max(...values) : 1;
  }, [sortedNodes, pingByNode]);

  const avgLatency = useMemo(() => {
    const values = nodes
      .filter((n) => n.ok && n.pingMs != null)
      .map((n) => n.pingMs as number);
    if (!values.length) return null;
    return Math.round(values.reduce((sum, ms) => sum + ms, 0) / values.length);
  }, [nodes]);

  const bestBandwidth = useMemo(() => {
    const values = Object.values(bandwidthByNode).filter(
      (mbps): mbps is number => mbps != null && mbps > 0,
    );
    return values.length ? Math.max(...values) : null;
  }, [bandwidthByNode]);

  const overallLabel =
    overall === "checking"
      ? t("status.checking")
      : t(`status.overall.${overall}`);

  const OverallIcon =
    overall === "checking"
      ? Loader2
      : STATUS_META[overall].icon;

  return (
    <Container className="py-10 sm:py-14 pb-[calc(var(--mobile-nav-total)+1.25rem)]">
      <div className="max-w-3xl mx-auto flex flex-col gap-8">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-sky-400/80">
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
            "site-panel p-5 sm:p-6 flex flex-col gap-4",
            overall !== "checking" && STATUS_META[overall].bg,
          )}
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <OverallIcon
                className={cn(
                  "w-8 h-8 shrink-0",
                  overall === "checking" && "animate-spin text-muted-foreground",
                  overall !== "checking" && STATUS_META[overall].color,
                )}
              />
              <div className="min-w-0">
                <p className="text-lg font-semibold text-foreground dark:text-white">
                  {overallLabel}
                </p>
                {ready && (
                  <p className="text-[12px] text-muted-foreground dark:text-white/50 mt-0.5">
                    {t("status.nodesOnline", { online: onlineCount, total: nodes.length })}
                    {fastestNode && fastestPing != null && (
                      <>
                        {" · "}
                        {t("status.fastest")}: {flagForLocation(fastestNode.location) ?? ""}{" "}
                        {fastestNode.location} ({fastestPing}ms)
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
              className="site-ghost-btn site-focus disabled:opacity-40 shrink-0"
            >
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
              {t("status.refresh")}
            </button>
          </div>

          {ready && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 border-t border-border/60 dark:border-white/8">
              <div className="rounded-xl bg-black/10 dark:bg-white/[0.03] px-3 py-2.5">
                <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wide text-muted-foreground/80 dark:text-white/30">
                  <Gauge className="w-3 h-3" />
                  {t("status.avgLatency")}
                </div>
                <p className={cn("mt-1 text-sm font-semibold tabular-nums", latencyClass(avgLatency))}>
                  {avgLatency != null ? t("status.latency", { ms: avgLatency }) : "—"}
                </p>
              </div>
              <div className="rounded-xl bg-black/10 dark:bg-white/[0.03] px-3 py-2.5">
                <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wide text-muted-foreground/80 dark:text-white/30">
                  <Wifi className="w-3 h-3" />
                  {t("status.bestBandwidth")}
                </div>
                <p className="mt-1 text-sm font-semibold tabular-nums text-foreground/85 dark:text-white/80">
                  {bestBandwidth != null
                    ? t("status.bandwidth", { mbps: formatMbps(bestBandwidth) })
                    : "—"}
                </p>
              </div>
              <div className="rounded-xl bg-black/10 dark:bg-white/[0.03] px-3 py-2.5 col-span-2 sm:col-span-1">
                <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wide text-muted-foreground/80 dark:text-white/30">
                  <Activity className="w-3 h-3" />
                  {t("status.proxyNodes")}
                </div>
                <p className="mt-1 text-sm font-semibold tabular-nums text-foreground/85 dark:text-white/80">
                  {onlineCount}/{nodes.length}
                  {offlineCount > 0 ? (
                    <span className="ml-1.5 text-[11px] font-medium text-rose-300/80">
                      · {t("status.offlineCount", { count: offlineCount })}
                    </span>
                  ) : null}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="site-panel p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3 border-sky-400/20 bg-sky-500/[0.06]">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 bg-sky-500/15 ring-sky-400/25 text-sky-300">
              <Globe2 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/80 dark:text-white/35">
                {t("status.clusterEndpoint")}
              </p>
              <a
                href={`${PUBLIC_KITTY_API_ORIGIN}/`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-sky-300 hover:text-sky-200 transition-colors break-all"
              >
                {PUBLIC_KITTY_API_ORIGIN}/
                <ExternalLink className="w-3.5 h-3.5 shrink-0 opacity-70" />
              </a>
              <p className="text-[12px] text-muted-foreground dark:text-white/45 mt-1 leading-relaxed">
                {t("status.clusterEndpointHint")}
              </p>
            </div>
          </div>
        </div>

        <div className="site-panel p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3 border-teal-400/20 bg-teal-500/[0.06]">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 bg-teal-500/15 ring-teal-400/25 text-teal-300">
              <Zap className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground dark:text-white/90">
                {t("status.modeAuto")}
              </p>
              <p className="text-[12px] text-muted-foreground dark:text-white/45 mt-0.5 leading-relaxed">
                {t("status.modeAutoDesc", {
                  location: activeMeta?.location ?? activeNode,
                })}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-mono text-muted-foreground/80 dark:text-white/25 uppercase tracking-widest">
                {t("status.proxyNodes")}
              </p>
              <p className="text-[12px] text-muted-foreground dark:text-white/40 mt-1">
                {t("status.proxyNodesHint")}
              </p>
            </div>
            {ready && (
              <p className="hidden sm:block text-[10px] font-mono text-muted-foreground/70 dark:text-white/25 shrink-0">
                {t("status.sortByPing")}
              </p>
            )}
          </div>

          {!ready && loading ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: KITTY_API_NODES.length }).map((_, i) => (
                <div
                  key={i}
                  className="site-panel p-4 sm:p-5 h-[88px] animate-pulse bg-muted/40 dark:bg-white/[0.03]"
                />
              ))}
            </div>
          ) : (
            sortedNodes.map((node) => {
              const ping = pingByNode[node.id];
              const bandwidth = bandwidthByNode[node.id];
              const online = nodes.find((n) => n.id === node.id)?.ok ?? false;
              const isRecommended = fastestNodeId === node.id && online;
              const isActive = activeNode === node.id;
              const barWidth = latencyBarWidth(ping ?? null, maxPing);

              return (
                <div
                  key={node.id}
                  className={cn(
                    "site-panel p-4 sm:p-5 flex flex-col gap-3",
                    !online && "opacity-70",
                    isActive && "border-sky-400/35 bg-sky-500/10 ring-1 ring-sky-400/20",
                    isRecommended && !isActive && "border-teal-400/20",
                  )}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div
                        className={cn(
                          "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 text-lg leading-none",
                          online
                            ? "bg-emerald-500/10 ring-emerald-500/20"
                            : "bg-red-500/10 ring-red-500/20 grayscale opacity-70",
                        )}
                      >
                        {flagForLocation(node.location) ?? (
                          <Globe2 className="w-4 h-4 text-muted-foreground" />
                        )}
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
                          {isActive && (
                            <span className="text-[9px] font-mono uppercase tracking-wide px-1.5 py-0.5 rounded bg-sky-500/15 border border-sky-400/25 text-sky-300/90">
                              {t("status.activeNode")}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground/80 dark:text-white/35 mt-1.5">
                          {loading && ping == null
                            ? t("status.measuring")
                            : online
                              ? t("status.nodeOnline")
                              : t("status.nodeOffline")}
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
                              {t("status.bandwidth", { mbps: formatMbps(bandwidth) })}
                            </>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-mono border",
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
                      </span>
                    </div>
                  </div>

                  {ping != null && (
                    <div className="pl-12">
                      <div className="h-1.5 rounded-full bg-muted/70 dark:bg-white/[0.06] overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-[width] duration-500",
                            ping < 120
                              ? "bg-emerald-400/80"
                              : ping < 280
                                ? "bg-amber-400/80"
                                : "bg-rose-400/80",
                          )}
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
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
          <Link
            href={ROUTES.FAQ}
            className="hover:text-foreground dark:hover:text-white/60 transition-colors"
          >
            {t("status.faqLink")}
          </Link>
        </p>
      </div>
    </Container>
  );
}
