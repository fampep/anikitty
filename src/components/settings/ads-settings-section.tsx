"use client";

import { useState } from "react";
import { Megaphone } from "lucide-react";
import { useT } from "@/providers/i18n-provider";
import { useSettingsStore } from "@/store/settings-store";
import { useAuthStore } from "@/store/auth-store";
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
  disabled,
}: {
  label: string;
  description: string;
  value: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
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
        disabled={disabled}
        onClick={() => onChange(!value)}
        className={cn(
          "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-45",
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
  const auth = useAuthStore((s) => s.auth);
  const showBannerAds = useSettingsStore((s) => s.showBannerAds);
  const setShowBannerAds = useSettingsStore((s) => s.setShowBannerAds);
  const [disableOpen, setDisableOpen] = useState(false);

  const handleToggle = (next: boolean) => {
    if (next) {
      setShowBannerAds(true);
      return;
    }
    setDisableOpen(true);
  };

  const confirmDisable = () => {
    setShowBannerAds(false);
    setDisableOpen(false);
  };

  return (
    <>
      <SectionCard>
        <SectionHeader
          icon={<Megaphone className="w-4 h-4" />}
          title={t("settings.ads.title")}
          description={t("settings.ads.desc")}
        />
        {auth ? (
          <ToggleRow
            label={t("settings.ads.showAds")}
            description={t("settings.ads.showAdsDesc")}
            value={showBannerAds}
            onChange={handleToggle}
          />
        ) : (
          <p className="px-5 py-4 text-xs text-muted-foreground dark:text-white/40 leading-relaxed">
            {t("settings.ads.signInHint")}
          </p>
        )}
      </SectionCard>

      <Dialog open={disableOpen} onOpenChange={setDisableOpen}>
        <DialogContent className="max-w-md gap-0 p-0 overflow-hidden border-border/80 dark:border-white/10 dark:bg-[#0a0a10]/98 [&>button:last-child]:top-3.5 [&>button:last-child]:right-3.5">
          <DialogHeader className="px-5 pt-5 pb-4 text-left border-b border-border/60 dark:border-white/[0.06]">
            <DialogTitle className="text-base font-semibold text-foreground dark:text-white/90">
              {t("settings.ads.disableTitle")}
            </DialogTitle>
            <DialogDescription className="text-[13px] leading-relaxed text-muted-foreground dark:text-white/50 pt-1">
              {t("settings.ads.disableIntro")}
            </DialogDescription>
          </DialogHeader>

          <div className="px-5 py-4 space-y-3">
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-4 py-3.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-200/80 mb-1.5">
                {t("settings.ads.disableEmbedTitle")}
              </p>
              <p className="text-[13px] leading-relaxed text-muted-foreground dark:text-white/55">
                {t("settings.ads.disableEmbedBody")}
              </p>
            </div>
            <p className="text-[13px] leading-relaxed text-muted-foreground dark:text-white/45">
              {t("settings.ads.disableNote")}
            </p>
          </div>

          <DialogFooter className="gap-2 px-5 py-4 border-t border-border/60 dark:border-white/[0.06] sm:justify-end">
            <button
              type="button"
              onClick={() => setDisableOpen(false)}
              className="site-ghost-btn py-2.5 text-sm"
            >
              {t("settings.ads.keepAds")}
            </button>
            <button
              type="button"
              onClick={confirmDisable}
              className="inline-flex items-center justify-center rounded-xl border border-border/70 bg-muted/50 px-4 py-2.5 text-sm font-semibold text-foreground/85 transition-colors hover:bg-accent dark:border-white/12 dark:bg-white/[0.05] dark:text-white/80 dark:hover:bg-white/[0.08]"
            >
              {t("settings.ads.disableConfirm")}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
