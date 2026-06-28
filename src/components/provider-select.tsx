"use client";

import { Captions, Server } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DEFAULT_KITTY_PROVIDER,
  kittyProvidersByGroup,
  type KittyProvider,
} from "@/lib/kitty-providers";
import { cn } from "@/lib/utils";
import { useT } from "@/providers/i18n-provider";

type Props = {
  value: KittyProvider;
  onChange: (provider: KittyProvider) => void;
  disabled?: boolean;
  compact?: boolean;
  className?: string;
};

export default function ProviderSelect({
  value,
  onChange,
  disabled,
  compact,
  className,
}: Props) {
  const t = useT();

  return (
    <Select value={value} onValueChange={(v) => onChange(v as KittyProvider)} disabled={disabled}>
      <SelectTrigger
        className={cn(
          compact
            ? "h-8 min-w-[9.5rem] text-[11px] font-mono bg-white/[0.04] border-white/12 text-white/70 hover:bg-white/[0.07]"
            : "h-9 min-w-[11rem] text-xs font-mono bg-white/[0.04] border-white/12 text-white/75 hover:bg-white/[0.07]",
          value === "Miruro" && "border-violet-500/25 bg-violet-500/[0.06] text-violet-100/85",
          value === "AnimeSogo" && "border-teal-500/25 bg-teal-500/[0.06] text-teal-100/85",
          className,
        )}
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <Server className="w-3.5 h-3.5 shrink-0 opacity-50" />
          <SelectValue placeholder={t("watch.providerSelect")} />
        </div>
      </SelectTrigger>
      <SelectContent className="bg-[#0c0c0c] border-white/10 max-h-[min(22rem,70vh)]">
        {(["featured", "other"] as const).map((group) => {
          const items = kittyProvidersByGroup(group);
          if (items.length === 0) return null;

          return (
            <SelectGroup key={group}>
              <SelectLabel className="text-[10px] font-mono uppercase tracking-widest text-white/30 px-2 py-1.5">
                {group === "featured"
                  ? t("watch.providerGroupFeatured")
                  : t("watch.providerGroupOther")}
              </SelectLabel>
              {items.map((p) => (
                <SelectItem
                  key={p.id}
                  value={p.id}
                  textValue={p.label}
                  className="text-xs text-white/80 focus:bg-white/[0.06] focus:text-white py-2.5"
                >
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{p.label}</span>
                      {p.kittySubs && (
                        <span className="inline-flex items-center gap-0.5 rounded px-1 py-px text-[9px] font-mono uppercase bg-violet-500/15 border border-violet-500/25 text-violet-300/90">
                          /subs
                        </span>
                      )}
                      {(p.nativeSubs || p.kittySubs) && (
                        <span className="inline-flex items-center gap-0.5 rounded px-1 py-px text-[9px] font-mono uppercase bg-teal-500/15 border border-teal-500/25 text-teal-300/90">
                          <Captions className="w-2.5 h-2.5" />
                          {t("watch.providerSubsBadge")}
                        </span>
                      )}
                    </div>
                    {p.hint && (
                      <span className="text-[10px] font-mono text-white/35 truncate">{p.hint}</span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectGroup>
          );
        })}
      </SelectContent>
    </Select>
  );
}

export function ProviderQuickPick({
  value,
  onChange,
  className,
}: {
  value: KittyProvider;
  onChange: (provider: KittyProvider) => void;
  className?: string;
}) {
  const featured = kittyProvidersByGroup("featured");

  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {featured.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => onChange(p.id)}
          className={cn(
            "px-2.5 py-1 rounded-md text-[11px] font-mono border transition-colors",
            p.id === value
              ? "bg-white/15 border-white/30 text-white"
              : "bg-transparent border-white/10 text-white/40 hover:border-white/25 hover:text-white/70",
          )}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

export { DEFAULT_KITTY_PROVIDER };
