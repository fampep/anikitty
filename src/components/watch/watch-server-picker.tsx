"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Captions, ChevronDown, Mic } from "lucide-react";
import type { KittyStreamQuality } from "@/lib/kitty/stream-quality";
import { formatStreamQualityLabel } from "@/lib/kitty/stream-quality";
import {
  fetchAnilistSiteServers,
  type AnilistSiteServer,
} from "@/lib/kitty/anilist-site-client";
import {
  isAnilistSiteProvider,
  isHardSubServerName,
  type AnilistSiteProviderId,
} from "@/lib/kitty/anilist-site-providers";
import type { KittyProvider, ProviderAudioMode } from "@/lib/kitty/kitty-providers";
import { resolveServerCodename } from "@/lib/kitty/server-display";
import { cn } from "@/lib/core/utils";
import { useT } from "@/providers/i18n-provider";

export type SiteServerPickMode = "sub" | "hardsub" | "dub";

type Props = {
  provider: KittyProvider;
  streamAudio: "sub" | "dub";
  audioMode?: ProviderAudioMode;
  activeLinkId?: string | null;
  qualities?: KittyStreamQuality[];
  activeFile?: string;
  dataIds?: string | null;
  onPickQuality: (entry: KittyStreamQuality) => void;
  onPickSiteServer: (server: AnilistSiteServer, mode: SiteServerPickMode) => void;
  className?: string;
};

const SECTION_STYLES: Record<
  SiteServerPickMode,
  { label: string; active: string; idle: string }
> = {
  sub: {
    label: "text-teal-300/70",
    active: "border-teal-400/45 bg-teal-500/25 text-teal-100",
    idle: "border-border dark:border-white/10 text-muted-foreground dark:text-white/45 hover:border-teal-500/30 hover:text-teal-200/80 hover:bg-teal-500/[0.06]",
  },
  hardsub: {
    label: "text-sky-300/70",
    active: "border-sky-400/45 bg-sky-500/25 text-sky-100",
    idle: "border-border dark:border-white/10 text-muted-foreground dark:text-white/45 hover:border-sky-500/30 hover:text-sky-200/80 hover:bg-sky-500/[0.06]",
  },
  dub: {
    label: "text-amber-300/70",
    active: "border-amber-400/45 bg-amber-500/25 text-amber-100",
    idle: "border-border dark:border-white/10 text-muted-foreground dark:text-white/45 hover:border-amber-500/30 hover:text-amber-200/80 hover:bg-amber-500/[0.06]",
  },
};

function QualityChip({
  q,
  active,
  onPick,
}: {
  q: KittyStreamQuality;
  active: boolean;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center gap-1 px-2.5 py-1.5 min-h-8 rounded-md text-[11px] font-mono font-semibold border transition-colors touch-manipulation",
        active
          ? "border-zinc-400/40 bg-zinc-500/20 text-zinc-50"
          : "border-border dark:border-white/10 text-muted-foreground dark:text-white/45 hover:border-zinc-400/25 hover:text-foreground/80 dark:hover:text-white/70",
      )}
    >
      {formatStreamQualityLabel(q.quality)}
      {active ? <span className="text-[10px] opacity-70" aria-hidden>✓</span> : null}
    </button>
  );
}

function ServerSection({
  mode,
  label,
  icon,
  servers,
  provider,
  activeLinkId,
  sectionActive,
  onPick,
}: {
  mode: SiteServerPickMode;
  label: string;
  icon: ReactNode;
  servers: AnilistSiteServer[];
  provider: KittyProvider;
  activeLinkId?: string | null;
  sectionActive: boolean;
  onPick: (server: AnilistSiteServer, mode: SiteServerPickMode) => void;
}) {
  if (servers.length === 0) return null;
  const styles = SECTION_STYLES[mode];

  return (
    <div className="rounded-xl border border-border dark:border-white/[0.06] bg-muted/20 dark:bg-white/[0.015] px-2.5 py-2 flex items-start gap-2 min-w-0">
      <div
        className={cn(
          "flex items-center gap-1 w-[4.75rem] shrink-0 pt-1.5 text-[10px] font-bold font-mono uppercase tracking-wide",
          styles.label,
        )}
      >
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <div className="flex flex-wrap gap-1.5 min-w-0 flex-1">
        {servers.map((s, index) => {
          const codename =
            resolveServerCodename(provider, s.name) ??
            resolveServerCodename(provider, s.id);
          const stripped = s.name.replace(/^HS:\s*/i, "").trim();
          const displayName = codename || stripped || `Line ${index + 1}`;
          const isActive = sectionActive && activeLinkId === s.id;
          return (
            <button
              key={`${mode}-${s.id}`}
              type="button"
              onClick={() => onPick(s, mode)}
              aria-pressed={isActive}
              title={s.name}
              className={cn(
                "px-2.5 py-1.5 rounded-md text-[11px] font-mono font-semibold border transition-colors touch-manipulation",
                isActive ? styles.active : styles.idle,
              )}
            >
              {displayName}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function WatchServerPicker({
  provider,
  streamAudio,
  audioMode = "sub",
  activeLinkId,
  qualities = [],
  activeFile,
  dataIds,
  onPickQuality,
  onPickSiteServer,
  className,
}: Props) {
  const t = useT();
  const [open, setOpen] = useState(true);
  const [subServers, setSubServers] = useState<AnilistSiteServer[]>([]);
  const [dubServers, setDubServers] = useState<AnilistSiteServer[]>([]);
  const [loadingSite, setLoadingSite] = useState(false);

  const uniqueQualities = useMemo(
    () => qualities.filter((q, i, arr) => arr.findIndex((x) => x.file === q.file) === i),
    [qualities],
  );
  const canFetchSite = isAnilistSiteProvider(provider) && Boolean(dataIds);
  const hasQualities = uniqueQualities.length > 1;
  const activeQuality = uniqueQualities.find((q) => q.file === activeFile);

  const softSubServers = useMemo(
    () => subServers.filter((s) => !isHardSubServerName(s.name)),
    [subServers],
  );
  const hardSubServers = useMemo(
    () => subServers.filter((s) => isHardSubServerName(s.name)),
    [subServers],
  );

  useEffect(() => {
    setSubServers([]);
    setDubServers([]);
    setOpen(true);
  }, [provider, dataIds]);

  useEffect(() => {
    if (!canFetchSite || !dataIds) return;
    let cancelled = false;
    setLoadingSite(true);
    void Promise.all([
      fetchAnilistSiteServers({
        provider: provider as AnilistSiteProviderId,
        dataIds,
        audio: "sub",
      }),
      fetchAnilistSiteServers({
        provider: provider as AnilistSiteProviderId,
        dataIds,
        audio: "dub",
      }),
    ])
      .then(([subRows, dubRows]) => {
        if (cancelled) return;
        setSubServers(subRows);
        setDubServers(dubRows);
      })
      .finally(() => {
        if (!cancelled) setLoadingSite(false);
      });
    return () => {
      cancelled = true;
    };
  }, [canFetchSite, dataIds, provider]);

  const hasServerSections =
    softSubServers.length > 0 || hardSubServers.length > 0 || dubServers.length > 0;

  if (!hasQualities && !canFetchSite) return null;
  if (!hasQualities && canFetchSite && !loadingSite && !hasServerSections) return null;

  const qualityChips = hasQualities && (
    <div className="flex flex-wrap gap-1.5">
      {uniqueQualities.map((q) => (
        <QualityChip
          key={q.file}
          q={q}
          active={activeFile === q.file}
          onPick={() => onPickQuality(q)}
        />
      ))}
    </div>
  );

  // Qualities only — show inline, no collapse.
  if (hasQualities && !canFetchSite) {
    return (
      <div
        className={cn(
          "rounded-lg border border-border dark:border-white/10 bg-muted/20 dark:bg-white/[0.02] px-3 py-2",
          className,
        )}
      >
        <p className="mb-1.5 text-[10px] font-mono uppercase tracking-widest text-muted-foreground dark:text-white/35">
          {t("watch.serverPickerTitle")}
        </p>
        {qualityChips}
      </div>
    );
  }

  const headerHint = activeQuality
    ? formatStreamQualityLabel(activeQuality.quality)
    : audioMode === "hardsub"
      ? t("watch.hardSubsSection")
      : streamAudio === "dub"
        ? t("card.dub")
        : t("watch.softSubBadge");

  return (
    <div
      className={cn(
        "rounded-lg border border-border dark:border-white/10 bg-muted/20 dark:bg-white/[0.02]",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-[11px] font-mono text-muted-foreground dark:text-white/55 hover:text-foreground dark:hover:text-white/80"
      >
        <span className="flex items-center gap-2 min-w-0">
          <span>{t("watch.serverPickerTitle")}</span>
          {headerHint && (
            <span className="truncate rounded-md border border-teal-400/25 bg-teal-500/10 px-1.5 py-px text-[9px] font-bold text-teal-200/90">
              {headerHint}
            </span>
          )}
        </span>
        <ChevronDown className={cn("w-3.5 h-3.5 shrink-0 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="border-t border-border dark:border-white/[0.06] px-2 py-2 space-y-2">
          {qualityChips}
          {loadingSite && (
            <p className="text-[10px] font-mono text-muted-foreground dark:text-white/35 px-1">
              {t("watch.serverPickerLoading")}
            </p>
          )}
          {!loadingSite && canFetchSite && !hasServerSections && (
            <p className="text-[10px] font-mono text-muted-foreground dark:text-white/35 px-1">
              {t("watch.serverPickerEmpty")}
            </p>
          )}
          <div className="flex flex-col gap-2">
            <ServerSection
              mode="sub"
              label={t("watch.softSubBadge")}
              icon={<Captions className="w-3 h-3 shrink-0" />}
              servers={softSubServers}
              provider={provider}
              activeLinkId={activeLinkId}
              sectionActive={audioMode !== "hardsub" && streamAudio === "sub"}
              onPick={onPickSiteServer}
            />
            <ServerSection
              mode="hardsub"
              label={t("watch.hardSubsSection")}
              icon={<Captions className="w-3 h-3 shrink-0" />}
              servers={hardSubServers}
              provider={provider}
              activeLinkId={activeLinkId}
              sectionActive={audioMode === "hardsub"}
              onPick={onPickSiteServer}
            />
            <ServerSection
              mode="dub"
              label={t("card.dub")}
              icon={<Mic className="w-3 h-3 shrink-0" />}
              servers={dubServers}
              provider={provider}
              activeLinkId={activeLinkId}
              sectionActive={streamAudio === "dub"}
              onPick={onPickSiteServer}
            />
          </div>
        </div>
      )}
    </div>
  );
}
