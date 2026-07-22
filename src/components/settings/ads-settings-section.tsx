"use client";

import { useState } from "react";
import Link from "next/link";
import { Heart, Megaphone } from "lucide-react";
import { useT } from "@/providers/i18n-provider";
import { useSettingsStore } from "@/store/settings-store";
import { useAuthStore } from "@/store/auth-store";
import { hasAdFreeAccess, hasActiveDonatorStatus } from "@/lib/social/supporter-access";
import { ROUTES } from "@/constants/routes";
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
          "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors",
          value ? "bg-emerald-500" : "bg-muted dark:bg-white/15",
          disabled && "opacity-60 cursor-not-allowed",
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

function formatUntil(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export default function AdsSettingsSection() {
  const t = useT();
  const auth = useAuthStore((s) => s.auth);
  const showBannerAds = useSettingsStore((s) => s.showBannerAds);
  const setShowBannerAds = useSettingsStore((s) => s.setShowBannerAds);
  const [cannotDisableOpen, setCannotDisableOpen] = useState(false);

  const canDisable = hasAdFreeAccess(auth?.role, auth?.supporterUntil);
  const isDonator = hasActiveDonatorStatus(auth?.role, auth?.supporterUntil);
  const untilLabel = formatUntil(auth?.supporterUntil);

  const handleToggle = (next: boolean) => {
    if (!canDisable) {
      setShowBannerAds(true);
      if (!next) setCannotDisableOpen(true);
      return;
    }
    setShowBannerAds(next);
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
          description={
            canDisable
              ? t("settings.ads.showAdsDescDonator")
              : t("settings.ads.showAdsDesc")
          }
          value={canDisable ? showBannerAds : true}
          onChange={handleToggle}
        />
        {canDisable ? (
          <div className="px-5 pb-4">
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/[0.06] px-3.5 py-3 flex items-start gap-2.5">
              <Heart className="w-3.5 h-3.5 shrink-0 mt-0.5 text-pink-300" />
              <p className="text-xs leading-relaxed text-emerald-100/85">
                {isDonator && untilLabel
                  ? t("settings.ads.donatorActiveUntil", { date: untilLabel })
                  : t("settings.ads.donatorActive")}
              </p>
            </div>
          </div>
        ) : (
          <div className="px-5 pb-4">
            <p className="text-xs text-muted-foreground dark:text-white/45 leading-relaxed">
              {t("settings.ads.optionalSupportHint")}{" "}
              <Link href={ROUTES.DONATE} className="text-primary underline-offset-2 hover:underline">
                {t("settings.ads.optionalSupportLink")}
              </Link>
            </p>
          </div>
        )}
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
            <Link
              href={ROUTES.DONATE}
              className="site-brand-btn py-2.5 text-sm"
              onClick={() => setCannotDisableOpen(false)}
            >
              {t("settings.ads.optionalSupportLink")}
            </Link>
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
