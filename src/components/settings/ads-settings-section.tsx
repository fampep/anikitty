"use client";

import { useState } from "react";
import Link from "next/link";
import { Megaphone } from "lucide-react";
import { useT } from "@/providers/i18n-provider";
import { DisableAdsDialog } from "@/components/ads/disable-ads-dialog";
import { ROUTES } from "@/constants/routes";
import { cn } from "@/lib/core/utils";

function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="site-section-card rounded-xl border border-border bg-card/50 overflow-hidden dark:border-white/10 dark:bg-white/[0.02]">
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
    <div className="flex items-start gap-3 px-5 py-4 border-b border-border dark:border-white/6">
      <span className="text-muted-foreground mt-0.5 shrink-0 dark:text-white/30">{icon}</span>
      <div>
        <h2 className="text-sm font-bold text-foreground dark:text-white/85">{title}</h2>
        <p className="text-[11px] text-muted-foreground font-mono mt-0.5 dark:text-white/30">
          {description}
        </p>
      </div>
    </div>
  );
}

function ToggleRow({
  icon,
  label,
  description,
  value,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      aria-label={label}
      onClick={() => onChange(!value)}
      className="flex w-full items-center justify-between gap-4 px-4 py-3 rounded-xl bg-muted/30 dark:bg-white/3 border border-border dark:border-white/8 hover:border-border dark:border-white/14 transition-colors cursor-pointer text-left"
    >
      <div className="flex items-center gap-3">
        <span className="text-muted-foreground dark:text-white/30" aria-hidden>
          {icon}
        </span>
        <div>
          <p className="text-sm font-medium text-foreground/85 dark:text-white/75">{label}</p>
          <p className="text-[10px] text-muted-foreground/80 dark:text-white/25 font-mono mt-0.5">
            {description}
          </p>
        </div>
      </div>
      <div
        aria-hidden
        className={cn(
          "relative w-10 h-5 rounded-full transition-colors duration-200 shrink-0",
          value ? "bg-muted/60 dark:bg-white/60" : "bg-accent dark:bg-white/12",
        )}
      >
        <div
          className={cn(
            "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200",
            value ? "translate-x-5" : "translate-x-0.5",
          )}
        />
      </div>
    </button>
  );
}

export default function AdsSettingsSection() {
  const t = useT();
  const [infoOpen, setInfoOpen] = useState(false);

  const handleToggle = (next: boolean) => {
    if (!next) {
      setInfoOpen(true);
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
        <div className="px-5 py-4 space-y-3">
          <ToggleRow
            icon={<Megaphone className="w-4 h-4" />}
            label={t("settings.ads.showAds")}
            description={t("settings.ads.showAdsDesc")}
            value={true}
            onChange={handleToggle}
          />
          <p className="text-[11px] text-muted-foreground dark:text-white/40 leading-relaxed">
            {t("settings.ads.donationHint")}{" "}
            <Link
              href={ROUTES.DONATE}
              className="text-primary underline-offset-2 hover:underline"
            >
              {t("settings.ads.donationLink")}
            </Link>
          </p>
        </div>
      </SectionCard>

      <DisableAdsDialog open={infoOpen} onOpenChange={setInfoOpen} />
    </>
  );
}
