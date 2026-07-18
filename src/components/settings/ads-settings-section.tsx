"use client";

import { useState } from "react";
import { Megaphone } from "lucide-react";
import { useT } from "@/providers/i18n-provider";
import { useSettingsStore } from "@/store/settings-store";
import { cn } from "@/lib/core/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border dark:border-white/10 bg-muted/20 dark:bg-white/[0.02] overflow-hidden">
      {children}
    </div>
  );
}

function SectionHeader({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="px-5 pt-5 pb-4 border-b border-border/60 dark:border-white/[0.06]">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 text-muted-foreground dark:text-white/45">{icon}</div>
        <div>
          <h2 className="text-sm font-bold text-foreground dark:text-white">{title}</h2>
          <p className="text-xs text-muted-foreground dark:text-white/40 mt-1 leading-relaxed">{description}</p>
        </div>
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description: string;
  value: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5 px-5">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground dark:text-white/90">{label}</p>
        <p className="text-xs text-muted-foreground dark:text-white/40 mt-0.5 leading-relaxed">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={cn(
          "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors",
          value ? "bg-emerald-500" : "bg-muted dark:bg-white/15",
        )}
      >
        <span
          className={cn(
            "inline-block h-5 w-5 rounded-full bg-white shadow transition-transform",
            value ? "translate-x-6" : "translate-x-1",
          )}
        />
      </button>
    </div>
  );
}

export default function AdsSettingsSection() {
  const t = useT();
  const setShowBannerAds = useSettingsStore((s) => s.setShowBannerAds);
  const [cannotDisableOpen, setCannotDisableOpen] = useState(false);

  const handleToggle = (next: boolean) => {
    // Always keep site ads on — explain why if the user tries to turn them off.
    setShowBannerAds(true);
    if (!next) {
      setCannotDisableOpen(true);
    }
  };

  return (
    <>
      <SectionCard>
        <SectionHeader
          icon={<Megaphone className="w-4 h-4" />}
          title={t("settings.ads.title")}
          description={t("settings.ads.desc")}
        />
        <ToggleRow
          label={t("settings.ads.showAds")}
          description={t("settings.ads.showAdsDesc")}
          value={true}
          onChange={handleToggle}
        />
      </SectionCard>

      <Dialog open={cannotDisableOpen} onOpenChange={setCannotDisableOpen}>
        <DialogContent className="max-w-md gap-0 p-0 overflow-hidden border-border/80 dark:border-white/10 dark:bg-[#09090b]/98 [&>button:last-child]:top-3.5 [&>button:last-child]:right-3.5">
          <DialogHeader className="px-5 pt-5 pb-4 text-left border-b border-border/60 dark:border-white/[0.06]">
            <DialogTitle className="text-base font-semibold text-foreground dark:text-white/90">
              {t("settings.ads.cannotDisableTitle")}
            </DialogTitle>
            <DialogDescription className="text-[13px] leading-relaxed text-muted-foreground dark:text-white/50 pt-1">
              {t("settings.ads.cannotDisableIntro")}
            </DialogDescription>
          </DialogHeader>

          <div className="px-5 py-4 space-y-3">
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-4 py-3.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-200/80 mb-1.5">
                {t("settings.ads.cannotDisableEmbedTitle")}
              </p>
              <p className="text-[13px] leading-relaxed text-muted-foreground dark:text-white/55">
                {t("settings.ads.cannotDisableEmbedBody")}
              </p>
            </div>
            <p className="text-[13px] leading-relaxed text-muted-foreground dark:text-white/45">
              {t("settings.ads.cannotDisableNote")}
            </p>
          </div>

          <DialogFooter className="gap-2 px-5 py-4 border-t border-border/60 dark:border-white/[0.06] sm:justify-end">
            <button
              type="button"
              onClick={() => setCannotDisableOpen(false)}
              className="site-ghost-btn py-2.5 text-sm"
            >
              {t("settings.ads.cannotDisableOk")}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
