"use client";

import ProfileAccountBadges from "@/components/profile/profile-account-badges";
import ProfileLevelBadges from "@/components/profile/profile-level-badges";
import ProfileTimestampBadges from "@/components/profile/profile-timestamp-badges";
import type { AccountBadges } from "@/lib/user/account-badges";
import { useT } from "@/providers/i18n-provider";

type Props = {
  accountBadges: AccountBadges | null;
  level?: number | null;
  currentTierName?: string;
  timestampApproved?: number | null;
  timestampTierId?: string | null;
};

export default function ProfileBadgesRow({
  accountBadges,
  level,
  currentTierName,
  timestampApproved,
  timestampTierId,
}: Props) {
  const t = useT();
  const hasAccount = accountBadges && (
    accountBadges.anilist ||
    accountBadges.discord ||
    accountBadges.twoFactor ||
    accountBadges.passkeys
  );
  const hasLevel = level != null && level >= 1;
  const hasTimestamp = (timestampApproved ?? 0) >= 3;

  if (!hasAccount && !hasLevel && !hasTimestamp) return null;

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
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/80 dark:text-white/25 mr-0.5 shrink-0">
            {t("profile.badges.ranksLabel")}
          </span>
          <ProfileLevelBadges level={level!} currentTierName={currentTierName} />
        </div>
      )}
      {hasTimestamp && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/80 dark:text-white/25 mr-0.5 shrink-0">
            {t("profile.badges.timestampRanksLabel")}
          </span>
          <ProfileTimestampBadges
            approved={timestampApproved!}
            currentTierId={timestampTierId}
          />
        </div>
      )}
    </div>
  );
}
