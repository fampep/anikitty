"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Coffee, ExternalLink, Heart } from "lucide-react";
import Container from "@/components/layout/container";
import { ROUTES } from "@/constants/routes";
import { kofiDonationUrl } from "@/lib/social/donation-config";
import { useT } from "@/providers/i18n-provider";
import { cn } from "@/lib/core/utils";

type GoalData = {
  configured: boolean;
  goalEur: number;
  raisedEur: number;
  percent: number;
};

export default function HomeDonationGoal() {
  const t = useT();
  const [goal, setGoal] = useState<GoalData | null>(null);

  useEffect(() => {
    fetch("/api/kofi/goal")
      .then((r) => r.json())
      .then((data) => setGoal(data as GoalData))
      .catch(() => setGoal(null));
  }, []);

  const showProgress = goal?.configured && goal.goalEur > 0;
  const percent = showProgress ? goal.percent : 0;

  return (
    <Container className="py-4">
      <div className="site-panel overflow-hidden border-zinc-500/15 bg-gradient-to-br from-zinc-500/[0.06] via-transparent to-zinc-500/[0.04]">
        <div className="flex flex-col gap-4 p-5 sm:p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-500/25 bg-zinc-500/10 text-zinc-300">
                <Heart className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold text-foreground dark:text-white/90">{t("home.donationGoalTitle")}</p>
                <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground dark:text-white/45">
                  {t("home.donationGoalBody")}
                </p>
              </div>
            </div>

            {showProgress && goal && (
              <div className="space-y-2 pl-[52px]">
                <div className="flex items-center justify-between gap-3 text-[11px] font-mono">
                  <span className="text-muted-foreground dark:text-white/40">{t("home.donationGoalProgress")}</span>
                  <span className="text-zinc-200/80">
                    {t("home.donationGoalAmount", {
                      raised: goal.raisedEur.toFixed(0),
                      goal: goal.goalEur.toFixed(0),
                    })}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full border border-border dark:border-white/8 bg-muted/50 dark:bg-white/[0.04]">
                  <div
                    className={cn(
                      "h-full rounded-full bg-gradient-to-r from-zinc-500 to-zinc-500 transition-all duration-700",
                    )}
                    style={{ width: `${Math.max(percent, percent > 0 ? 4 : 0)}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
            <a
              href={kofiDonationUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="site-brand-btn px-4 py-2.5 text-sm"
            >
              <Coffee className="h-4 w-4" />
              {t("home.donationGoalCta")}
              <ExternalLink className="h-3.5 w-3.5 opacity-70" />
            </a>
            <Link href={ROUTES.DONATE} className="site-ghost-btn py-2.5 text-sm">
              {t("home.donationGoalLearn")}
            </Link>
          </div>
        </div>
      </div>
    </Container>
  );
}
