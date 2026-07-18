"use client";

import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DiscordIcon } from "@/components/auth/discord-connect";
import { DISCORD_INVITE_URL } from "@/constants/site-meta";
import { ROUTES } from "@/constants/routes";
import { useT } from "@/providers/i18n-provider";
import { Activity, ExternalLink } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDismiss: () => void;
};

export default function DiscordWelcomeDialog({ open, onOpenChange, onDismiss }: Props) {
  const t = useT();

  const handleDismiss = () => {
    onDismiss();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-0 p-0 overflow-hidden sm:rounded-2xl">
        <div className="border-b border-border dark:border-white/8 bg-gradient-to-br from-indigo-500/15 via-transparent to-zinc-500/10 px-6 pt-6 pb-4">
          <DialogHeader className="space-y-3 text-left">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-500/15 ring-1 ring-indigo-400/25 text-indigo-300">
              <DiscordIcon className="w-6 h-6" />
            </div>
            <DialogTitle className="text-lg font-bold tracking-tight">
              {t("discordPrompt.title")}
            </DialogTitle>
            <DialogDescription className="text-[13px] leading-relaxed text-muted-foreground dark:text-white/45">
              {t("discordPrompt.intro")}
            </DialogDescription>
          </DialogHeader>
        </div>

        <ul className="px-6 py-4 space-y-2.5">
          {(["updates", "status", "community"] as const).map((key) => (
            <li
              key={key}
              className="flex gap-3 rounded-xl border border-border dark:border-white/8 bg-muted/30 dark:bg-white/[0.02] px-3.5 py-2.5 text-[13px] leading-relaxed text-foreground/85 dark:text-white/70"
            >
              <span className="mt-0.5 text-indigo-400">•</span>
              {t(`discordPrompt.points.${key}`)}
            </li>
          ))}
        </ul>

        <DialogFooter className="border-t border-border dark:border-white/8 px-6 py-4 flex-col sm:flex-col gap-2 bg-muted/20 dark:bg-white/[0.02]">
          <Button
            asChild
            className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white border-0"
            onClick={handleDismiss}
          >
            <a href={DISCORD_INVITE_URL} target="_blank" rel="noopener noreferrer">
              <DiscordIcon className="w-4 h-4 mr-2" />
              {t("discordPrompt.joinDiscord")}
              <ExternalLink className="w-3.5 h-3.5 ml-2 opacity-70" />
            </a>
          </Button>
          <Button
            asChild
            variant="outline"
            className="w-full border-border dark:border-white/12"
            onClick={handleDismiss}
          >
            <Link href={ROUTES.STATUS}>
              <Activity className="w-4 h-4 mr-2" />
              {t("discordPrompt.viewStatus")}
            </Link>
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full text-muted-foreground dark:text-white/40"
            onClick={handleDismiss}
          >
            {t("discordPrompt.maybeLater")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
