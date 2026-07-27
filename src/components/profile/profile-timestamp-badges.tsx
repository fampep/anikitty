"use client";

import { Timer } from "lucide-react";
import ProfileBadgePill from "@/components/profile/profile-badge-pill";
import { getEarnedTimestampTiers } from "@/lib/skip/timestamp-helper-config";
import { TIMESTAMP_TIER_ICONS } from "@/lib/skip/timestamp-tier-icons";
import { useT } from "@/providers/i18n-provider";

type Props = {
  approved: number;
  currentTierId?: string | null;
};

export default function ProfileTimestampBadges({ approved, currentTierId }: Props) {
  const t = useT();
  const earned = getEarnedTimestampTiers(approved);
  if (earned.length === 0) return null;

  return (
    <>
      {earned.map((tier) => {
        const Icon = TIMESTAMP_TIER_ICONS[tier.icon] ?? Timer;
        const isCurrent = tier.id === currentTierId;
        const title = isCurrent
          ? `${tier.name} · ${approved}+ approved · ${t("profile.badges.currentRank")}`
          : `${tier.name} · ${tier.minApproved}+ approved`;

        return (
          <ProfileBadgePill
            key={tier.id}
            label={tier.name}
            title={title}
            color={tier.color}
            active={isCurrent}
            icon={<Icon className="w-3.5 h-3.5 shrink-0" strokeWidth={2.25} />}
          />
        );
      })}
    </>
  );
}
