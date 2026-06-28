"use client";

import { Star } from "lucide-react";
import ProfileBadgePill from "@/components/profile-badge-pill";
import { LEVEL_TIER_ICONS, tierNameToKey } from "@/lib/level-tier-icons";
import { getEarnedTiers } from "@/lib/user-level";
import { useT } from "@/providers/i18n-provider";

type Props = {
  level: number;
  currentTierName?: string;
};

export default function ProfileLevelBadges({ level, currentTierName }: Props) {
  const t = useT();
  const earned = getEarnedTiers(level);
  const iconClass = "w-3.5 h-3.5 shrink-0";

  if (earned.length === 0) return null;

  return (
    <>
      {earned.map((tier) => {
        const Icon = LEVEL_TIER_ICONS[tier.icon] ?? Star;
        const label = t(`profile.levelTiers.${tierNameToKey(tier.name)}`);
        const isCurrent = tier.name === currentTierName;
        const title = isCurrent
          ? `${label} · Lv.${tier.minLevel}+ · ${t("profile.badges.currentRank")}`
          : `${label} · Lv.${tier.minLevel}+`;

        return (
          <ProfileBadgePill
            key={tier.name}
            label={label}
            title={title}
            color={tier.color}
            active={isCurrent}
            icon={<Icon className={iconClass} strokeWidth={2.25} />}
          />
        );
      })}
    </>
  );
}
