"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import DiscordWelcomeDialog from "@/components/site/discord-welcome-dialog";
import {
  readDiscordPromptDismissed,
  writeDiscordPromptDismissed,
} from "@/lib/site/discord-prompt-storage";
import { isPublicAdminUiPath } from "@/lib/security/admin-panel-path-public";

const SHOW_DELAY_MS = 1400;

export default function DiscordWelcomePrompt() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready || !pathname) return;
    if (isPublicAdminUiPath(pathname)) return;
    if (readDiscordPromptDismissed()) return;

    const timer = window.setTimeout(() => {
      if (!readDiscordPromptDismissed()) setOpen(true);
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
