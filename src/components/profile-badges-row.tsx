"use client";

import ProfileAccountBadges from "@/components/profile-account-badges";
import ProfileLevelBadges from "@/components/profile-level-badges";
import type { AccountBadges } from "@/lib/account-badges";
import { useT } from "@/providers/i18n-provider";

type Props = {
  accountBadges: AccountBadges | null;
  level?: number | null;
  currentTierName?: string;
};

export default function ProfileBadgesRow({ accountBadges, level, currentTierName }: Props) {
  const t = useT();
  const hasAccount = accountBadges && (
    accountBadges.anilist ||
    accountBadges.discord ||
    accountBadges.anisurge ||
    accountBadges.twoFactor ||
    accountBadges.passkeys
  );
  const hasLevel = level != null && level >= 1;

  if (!hasAccount && !hasLevel) return null;

  return (
    <div className="flex flex-col gap-2 mt-2.5">
      {hasAccount && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="sr-only">{t("profile.badges.connectionsLabel")}</span>
          <ProfileAccountBadges badges={accountBadges!} />
        </div>
      )}
      {hasLevel && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-mono uppercase tracking-wider text-white/25 mr-0.5 shrink-0">
            {t("profile.badges.ranksLabel")}
          </span>
          <ProfileLevelBadges level={level!} currentTierName={currentTierName} />
        </div>
      )}
    </div>
  );
}
