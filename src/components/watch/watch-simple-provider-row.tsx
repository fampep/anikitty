"use client";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProviderDefaultBadge } from "@/components/player/provider-select";
import {
  KITTY_PROVIDER_META,
  kittyProvidersByGroup,
  providerSupportsSub,
  providerSupportsDub,
  type KittyProvider,
} from "@/lib/kitty/kitty-providers";
import { Captions, Headphones, Mic, Server, Zap } from "lucide-react";
import { useT } from "@/providers/i18n-provider";
import { cn } from "@/lib/core/utils";

type Props = {
  provider: KittyProvider;
  streamAudio: "sub" | "dub";
  onAudioChange: (audio: "sub" | "dub") => void;
  onProviderChange: (provider: KittyProvider) => void;
  className?: string;
};

const TRIGGER_CLASS =
  "h-9 w-full min-w-0 text-[12px] font-mono bg-muted/50 dark:bg-white/[0.05] border-border dark:border-white/12 text-foreground/85 dark:text-white/75 hover:bg-accent dark:hover:bg-white/[0.08]";

const CONTENT_CLASS = "bg-[#0c0c0c] border-border dark:border-white/10";

function FieldLabel({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mb-1 flex items-center gap-1.5 px-0.5 text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground dark:text-white/35">
      {icon}
      {children}
    </div>
  );
}

function LangBadges({ id }: { id: KittyProvider }) {
  const sub = providerSupportsSub(id);
  const dub = providerSupportsDub(id);
  return (
    <span className="ml-auto flex items-center gap-1 pl-3 shrink-0">
      {sub && (
        <span className="inline-flex items-center gap-0.5 text-[9px] font-mono font-bold text-sky-300/85">
          <Captions className="w-2.5 h-2.5" />
          SUB
        </span>
      )}
      {dub && (
        <span className="inline-flex items-center gap-0.5 text-[9px] font-mono font-bold text-purple-300/85">
          <Mic className="w-2.5 h-2.5" />
          DUB
        </span>
      )}
    </span>
  );
}

export default function WatchSimpleProviderRow({
  provider,
  streamAudio,
  onAudioChange,
  onProviderChange,
  className,
}: Props) {
  const t = useT();
  const serverCount = KITTY_PROVIDER_META.length;
  const dubEnabled = providerSupportsDub(provider);

  return (
    <div
      className={cn(
        "rounded-xl border border-border dark:border-white/[0.08] bg-muted/30 dark:bg-white/[0.02] p-2.5 space-y-2.5",
        className,
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-stretch gap-2.5 sm:gap-2">
        <div className="min-w-0 flex-1">
          <FieldLabel icon={<Headphones className="w-3 h-3" />}>{t("watch.audio")}</FieldLabel>
          <Select value={streamAudio} onValueChange={(v) => onAudioChange(v as "sub" | "dub")}>
            <SelectTrigger className={TRIGGER_CLASS}>
              <div className="flex items-center gap-1.5 min-w-0">
                <Captions className="w-3.5 h-3.5 shrink-0 opacity-60" />
                <SelectValue />
              </div>
            </SelectTrigger>
            <SelectContent className={CONTENT_CLASS}>
              <SelectItem value="sub" className="text-xs">{t("card.sub")}</SelectItem>
              <SelectItem value="dub" className="text-xs" disabled={!dubEnabled}>
                {t("card.dub")}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="min-w-0 flex-1">
          <FieldLabel icon={<Server className="w-3 h-3" />}>
            {t("watch.server")}
            <span className="text-muted-foreground/60 dark:text-white/25">({serverCount})</span>
          </FieldLabel>
          <Select value={provider} onValueChange={(v) => onProviderChange(v as KittyProvider)}>
            <SelectTrigger className={TRIGGER_CLASS}>
              <div className="flex items-center gap-1.5 min-w-0">
                <Zap className="w-3.5 h-3.5 shrink-0 opacity-60" />
                <SelectValue />
              </div>
            </SelectTrigger>
            <SelectContent className={cn(CONTENT_CLASS, "max-h-[min(22rem,60vh)]")}>
              {(["featured", "other"] as const).map((group) => {
                const items = kittyProvidersByGroup(group);
                if (items.length === 0) return null;
                return (
                  <SelectGroup key={group}>
                    <SelectLabel className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground dark:text-white/30 px-2 py-1.5">
                      {group === "featured"
                        ? t("watch.providerGroupFeatured")
                        : t("watch.providerGroupOther")}
                    </SelectLabel>
                    {items.map((p) => (
                      <SelectItem
                        key={p.id}
                        value={p.id}
                        textValue={p.label}
                        className="text-xs text-foreground/90 dark:text-white/80"
                      >
                        <span className="flex w-full items-center gap-2 min-w-0">
                          <span className="font-semibold truncate">{p.label}</span>
                          <ProviderDefaultBadge id={p.id} />
                          <LangBadges id={p.id} />
                        </span>
                      </SelectItem>
                    ))}
                  </SelectGroup>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
