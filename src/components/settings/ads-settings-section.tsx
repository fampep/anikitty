"use client";

import { Megaphone } from "lucide-react";
import { useT } from "@/providers/i18n-provider";
import { useSettingsStore } from "@/store/settings-store";
import { useAuthStore } from "@/store/auth-store";
import { cn } from "@/lib/core/utils";

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
  const auth = useAuthStore((s) => s.auth);
  const showBannerAds = useSettingsStore((s) => s.showBannerAds);
  const setShowBannerAds = useSettingsStore((s) => s.setShowBannerAds);

  return (
    <SectionCard>
      <SectionHeader
        icon={<Megaphone className="w-4 h-4" />}
        title={t("settings.ads.title")}
        description={t("settings.ads.desc")}
      />
      <ToggleRow
        label={t("settings.ads.showAds")}
        description={t("settings.ads.showAdsDesc")}
        value={showBannerAds}
        onChange={setShowBannerAds}
      />
      {!auth ? (
        <p className="px-5 pb-4 text-[11px] text-muted-foreground dark:text-white/35 leading-relaxed">
          {t("settings.ads.signInHint")}
        </p>
      ) : null}
    </SectionCard>
  );
}
