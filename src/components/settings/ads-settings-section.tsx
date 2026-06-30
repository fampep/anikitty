"use client";

import { useState } from "react";
import Link from "next/link";
import { Megaphone } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { useSettingsStore } from "@/store/settings-store";
import { useT } from "@/providers/i18n-provider";
import { DisableAdsDialog } from "@/components/ads/disable-ads-dialog";
import { ROUTES } from "@/constants/routes";

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
    <div
      className="flex items-center justify-between gap-4 px-4 py-3 rounded-xl bg-white/3 border border-white/8 hover:border-white/14 transition-colors cursor-pointer"
      onClick={() => onChange(!value)}
      role="switch"
      aria-checked={value}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onChange(!value);
        }
      }}
    >
      <div className="flex items-center gap-3">
        <span className="text-white/30">{icon}</span>
        <div>
          <p className="text-sm font-medium text-white/75">{label}</p>
          <p className="text-[10px] text-white/25 font-mono mt-0.5">{description}</p>
        </div>
      </div>
      <div
        className={`relative w-10 h-5 rounded-full transition-colors duration-200 shrink-0 ${
          value ? "bg-violet-500/70" : "bg-white/12"
        }`}
      >
        <div
          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
            value ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </div>
    </div>
  );
}

function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.02] overflow-hidden">{children}</div>
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
    <div className="flex items-start gap-3 px-5 py-4 border-b border-white/6">
      <span className="text-white/30 mt-0.5 shrink-0">{icon}</span>
      <div>
        <h2 className="text-sm font-bold text-white/85">{title}</h2>
        <p className="text-[11px] text-white/30 font-mono mt-0.5">{description}</p>
      </div>
    </div>
  );
}

function SectionBody({ children }: { children: React.ReactNode }) {
  return <div className="px-5 py-4">{children}</div>;
}

export default function AdsSettingsSection() {
  const t = useT();
  const { auth } = useAuthStore();
  const showAds = useSettingsStore((s) => s.showAds);
  const setShowAds = useSettingsStore((s) => s.setShowAds);
  const [disableOpen, setDisableOpen] = useState(false);

  const handleToggle = (next: boolean) => {
    if (!next && showAds) {
      setDisableOpen(true);
      return;
    }
    setShowAds(next);
  };

  return (
    <>
      <SectionCard>
        <SectionHeader
          icon={<Megaphone className="w-4 h-4" />}
          title={t("settings.ads.title")}
          description={t("settings.ads.desc")}
        />
        <SectionBody>
          {auth ? (
            <ToggleRow
              icon={<Megaphone className="w-4 h-4" />}
              label={t("settings.ads.showAds")}
              description={t("settings.ads.showAdsDesc")}
              value={showAds}
              onChange={handleToggle}
            />
          ) : (
            <p className="text-sm text-white/45 leading-relaxed">
              {t("settings.ads.signInHint")}{" "}
              <Link href={ROUTES.SETTINGS} className="text-violet-300/90 hover:text-violet-200 underline-offset-2 hover:underline">
                {t("nav.login")}
              </Link>
            </p>
          )}
        </SectionBody>
      </SectionCard>

      <DisableAdsDialog
        open={disableOpen}
        onOpenChange={setDisableOpen}
        onConfirm={() => setShowAds(false)}
      />
    </>
  );
}
