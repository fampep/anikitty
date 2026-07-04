"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import DiscordWelcomeDialog from "@/components/site/discord-welcome-dialog";
import {
  readDiscordPromptDismissed,
  writeDiscordPromptDismissed,
} from "@/lib/site/discord-prompt-storage";
import { useSettingsStore } from "@/store/settings-store";

const SHOW_DELAY_MS = 1400;
const SKIP_PATH_PREFIXES = ["/admin"];

export default function DiscordWelcomePrompt() {
  const pathname = usePathname();
  const liteMode = useSettingsStore((s) => s.liteMode);
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready || !pathname) return;
    if (SKIP_PATH_PREFIXES.some((p) => pathname.startsWith(p))) return;
    if (readDiscordPromptDismissed()) return;

    const timer = window.setTimeout(() => {
      if (!readDiscordPromptDismissed()) setOpen(true);
    }, liteMode ? 0 : SHOW_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [ready, pathname, liteMode]);

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
