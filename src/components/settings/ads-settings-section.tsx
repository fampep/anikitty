"use client";

import Link from "next/link";
import { Megaphone } from "lucide-react";
import { ROUTES } from "@/constants/routes";

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

export default function AdsSettingsSection() {
  return (
    <SectionCard>
      <SectionHeader
        icon={<Megaphone className="w-4 h-4" />}
        title="Support Us Instead of Ads"
        description="We've replaced ads with a permanent support banner"
      />
      <div className="px-5 py-4 space-y-3">
        <p className="text-sm text-foreground dark:text-white/75 leading-relaxed">
          We&apos;ve removed intrusive ads and replaced them with a permanent support banner asking for Kifu donations. This helps cover our server costs while maintaining a better viewing experience for everyone.
        </p>
        <p className="text-[11px] text-muted-foreground dark:text-white/50 leading-relaxed">
          Thank you for supporting us! Every contribution helps keep AniKitty free and accessible.{" "}
          <Link
            href={ROUTES.DONATE}
            className="text-primary underline-offset-2 hover:underline"
          >
            Learn about supporting us
          </Link>
        </p>
      </div>
    </SectionCard>
  );
}
