"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import DiscordWelcomeDialog from "@/components/site/discord-welcome-dialog";
import {
  readDiscordPromptDismissed,
  writeDiscordPromptDismissed,
} from "@/lib/site/discord-prompt-storage";
import { ROUTES } from "@/constants/routes";

/** Only nudge on home, after the user has settled — avoid watch / browse noise. */
const SHOW_DELAY_MS = 14_000;

export default function DiscordWelcomePrompt() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready || !pathname) return;
    if (pathname !== ROUTES.HOME) return;
    if (readDiscordPromptDismissed()) return;

    const timer = window.setTimeout(() => {
      if (!readDiscordPromptDismissed() && window.location.pathname === ROUTES.HOME) {
        setOpen(true);
      }
    }, SHOW_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [ready, pathname]);

  const dismiss = () => writeDiscordPromptDismissed();

  return (
    <DiscordWelcomeDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) dismiss();
      }}
      onDismiss={dismiss}
    />
  );
}
