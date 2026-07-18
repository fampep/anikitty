"use client";

import type { ReactNode } from "react";
import { Fingerprint, ShieldCheck, Zap } from "lucide-react";
import AnilistIcon from "@/icons/anilist";
import DiscordIcon from "@/icons/discord";
import ProfileBadgePill from "@/components/profile/profile-badge-pill";
import type { AccountBadges } from "@/lib/user/account-badges";
import { useT } from "@/providers/i18n-provider";

type BadgeSpec = {
  key: string;
  label: string;
  title?: string;
  color: string;
  icon: ReactNode;
};

export default function ProfileAccountBadges({ badges }: { badges: AccountBadges }) {
  const t = useT();
  const iconClass = "w-3.5 h-3.5 shrink-0";

  const items: BadgeSpec[] = [];

  if (badges.anilist) {
    items.push({
      key: "anilist",
      label: t("profile.badges.anilist"),
      title: badges.anilistUsername
        ? `${t("profile.badges.anilist")} · @${badges.anilistUsername}`
        : t("profile.badges.anilist"),
      color: "#02A9FF",
      icon: <AnilistIcon className={iconClass} />,
    });
  }

  if (badges.discord) {
    items.push({
      key: "discord",
      label: t("profile.badges.discord"),
      title: badges.discordUsername
        ? `${t("profile.badges.discord")} · ${badges.discordUsername}`
        : t("profile.badges.discord"),
      color: "#5865F2",
      icon: <DiscordIcon className={iconClass} />,
    });
  }

  if (badges.anisurge) {
    items.push({
      key: "anisurge",
      label: t("profile.badges.anisurge"),
      title: badges.anisurgeUsername
        ? `${t("profile.badges.anisurge")} · @${badges.anisurgeUsername}`
        : t("profile.badges.anisurge"),
      color: "#a1a1aa",
      icon: <Zap className={iconClass} strokeWidth={2.25} />,
    });
  }

  if (badges.twoFactor) {
    items.push({
      key: "2fa",
      label: t("profile.badges.twoFactor"),
      title: t("profile.badges.twoFactor"),
      color: "#34d399",
      icon: <ShieldCheck className={iconClass} strokeWidth={2.25} />,
    });
  }

  if (badges.passkeys) {
    items.push({
      key: "passkey",
      label: t("profile.badges.passkey"),
      title: t("profile.badges.passkey"),
      color: "#22d3ee",
      icon: <Fingerprint className={iconClass} strokeWidth={2.25} />,
    });
  }

  if (items.length === 0) return null;

  return (
    <>
      {items.map((item) => (
        <ProfileBadgePill
          key={item.key}
          label={item.label}
          title={item.title}
          color={item.color}
          icon={item.icon}
        />
      ))}
    </>
  );
}
