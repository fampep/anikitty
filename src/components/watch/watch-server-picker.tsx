"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Captions, Flame, Mic } from "lucide-react";
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
  /** Compact rows for AniDap-style split panel (no outer chrome). */
  embedded?: boolean;
  className?: string;
};

const SECTION_STYLES: Record<
  SiteServerPickMode,
  { label: string; active: string; idle: string }
> = {
  sub: {
    label: "text-teal-300/80",
    active: "border-teal-400/45 bg-teal-500/25 text-teal-100",
    idle: "border-white/8 bg-[#131313] text-white/55 hover:bg-[#1b1b1b] hover:text-white/80",
  },
  hardsub: {
    label: "text-sky-300/80",
    active: "border-sky-400/45 bg-sky-500/25 text-sky-100",
    idle: "border-white/8 bg-[#131313] text-white/55 hover:bg-[#1b1b1b] hover:text-white/80",
  },
  dub: {
    label: "text-amber-300/80",
    active: "border-amber-400/45 bg-amber-500/25 text-amber-100",
    idle: "border-white/8 bg-[#131313] text-white/55 hover:bg-[#1b1b1b] hover:text-white/80",
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
        "inline-flex min-h-8 min-w-[4.5rem] items-center justify-center gap-1 rounded-lg border px-2.5 py-1.5 text-[12px] font-semibold transition-colors touch-manipulation",
        active
          ? "border-zinc-400/40 bg-zinc-500/20 text-zinc-50"
          : "border-white/8 bg-[#131313] text-white/55 hover:bg-[#1b1b1b] hover:text-white/80",
      )}
    >
      {formatStreamQualityLabel(q.quality)}
    </button>
  );
}

function ServerRow({
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
    <div className="flex items-center gap-2.5 min-w-0">
      <div
        className={cn(
          "flex w-[4.25rem] shrink-0 items-center gap-1 text-[11px] font-bold font-mono uppercase tracking-wide",
          styles.label,
        )}
      >
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <div className="flex min-w-0 flex-1 flex-wrap justify-end gap-1.5 sm:justify-start">
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
                "inline-flex min-h-8 min-w-[5.5rem] items-center justify-between gap-1.5 rounded-lg border px-2.5 py-1.5 text-[12px] font-semibold transition-colors touch-manipulation",
                isActive ? styles.active : styles.idle,
              )}
            >
              <span className="truncate">{displayName}</span>
              {isActive ? <span className="text-[10px] opacity-70" aria-hidden>✓</span> : null}
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
  embedded = false,
  className,
}: Props) {
  const t = useT();
  const [subServers, setSubServers] = useState<AnilistSiteServer[]>([]);
  const [dubServers, setDubServers] = useState<AnilistSiteServer[]>([]);
  const [loadingSite, setLoadingSite] = useState(false);

  const uniqueQualities = useMemo(
    () => qualities.filter((q, i, arr) => arr.findIndex((x) => x.file === q.file) === i),
    [qualities],
  );
  const canFetchSite = isAnilistSiteProvider(provider) && Boolean(dataIds);
  const hasQualities = uniqueQualities.length > 1;

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

  const qualityRow = hasQualities && (
    <div className="flex items-center gap-2.5 min-w-0">
      <div className="flex w-[4.25rem] shrink-0 items-center text-[11px] font-bold font-mono uppercase tracking-wide text-zinc-300/70">
        {t("watch.serverPickerTitle")}
      </div>
      <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
        {uniqueQualities.map((q) => (
          <QualityChip
            key={q.file}
            q={q}
            active={activeFile === q.file}
            onPick={() => onPickQuality(q)}
          />
        ))}
      </div>
    </div>
  );

  const body = (
    <div className={cn("flex flex-col gap-2", !embedded && "space-y-0")}>
      {qualityRow}
      {loadingSite && (
        <p className="px-0.5 text-[10px] font-mono text-muted-foreground dark:text-white/35">
          {t("watch.serverPickerLoading")}
        </p>
      )}
      {!loadingSite && canFetchSite && !hasServerSections && (
        <p className="px-0.5 text-[10px] font-mono text-muted-foreground dark:text-white/35">
          {t("watch.serverPickerEmpty")}
        </p>
      )}
      <ServerRow
        mode="sub"
        label={t("watch.softSubBadge")}
        icon={<Captions className="h-3 w-3 shrink-0" />}
        servers={softSubServers}
        provider={provider}
        activeLinkId={activeLinkId}
        sectionActive={audioMode !== "hardsub" && streamAudio === "sub"}
        onPick={onPickSiteServer}
      />
      <ServerRow
        mode="hardsub"
        label={t("watch.hardSubsShort")}
        icon={<Flame className="h-3 w-3 shrink-0" />}
        servers={hardSubServers}
        provider={provider}
        activeLinkId={activeLinkId}
        sectionActive={audioMode === "hardsub"}
        onPick={onPickSiteServer}
      />
      <ServerRow
        mode="dub"
        label={t("card.dub")}
        icon={<Mic className="h-3 w-3 shrink-0" />}
        servers={dubServers}
        provider={provider}
        activeLinkId={activeLinkId}
        sectionActive={streamAudio === "dub"}
        onPick={onPickSiteServer}
      />
    </div>
  );

  if (embedded) {
    return <div className={cn("min-w-0", className)}>{body}</div>;
  }

  return (
    <div
      className={cn(
        "rounded-xl border border-border/60 dark:border-white/[0.08] bg-muted/20 dark:bg-[#0c0c0c]/80 px-3 py-2.5",
        className,
      )}
    >
      {body}
    </div>
  );
}
