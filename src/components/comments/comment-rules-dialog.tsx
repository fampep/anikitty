"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, EyeOff, Shield, Ban } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/core/utils";
import { useT } from "@/providers/i18n-provider";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccept?: () => void;
  /** Already accepted — view-only, no checkbox required. */
  readOnly?: boolean;
};

const RULE_KEYS = [
  "comments.rules.items.spoilers",
  "comments.rules.items.respect",
  "comments.rules.items.nsfw",
  "comments.rules.items.spam",
  "comments.rules.items.moderation",
] as const;

const RULE_ICONS = [EyeOff, Shield, Ban, AlertTriangle, Shield] as const;

export default function CommentRulesDialog({
  open,
  onOpenChange,
  onAccept,
  readOnly = false,
}: Props) {
  const t = useT();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (open) setChecked(false);
  }, [open]);

  const handleAccept = () => {
    onAccept?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-md gap-0 p-0 overflow-hidden sm:rounded-2xl"
        onPointerDownOutside={(e) => {
          if (!readOnly) e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          if (!readOnly) e.preventDefault();
        }}
      >
        <div className="border-b border-border dark:border-white/8 bg-gradient-to-br from-violet-500/10 via-transparent to-fuchsia-500/5 px-6 pt-6 pb-4">
          <DialogHeader className="space-y-2 text-left">
            <DialogTitle className="text-lg font-bold tracking-tight">
              {t("comments.rules.title")}
            </DialogTitle>
            <DialogDescription className="text-[13px] leading-relaxed text-muted-foreground dark:text-white/45">
              {t("comments.rules.intro")}
            </DialogDescription>
          </DialogHeader>
        </div>

        <ul className="px-6 py-4 space-y-3 max-h-[min(50vh,320px)] overflow-y-auto">
          {RULE_KEYS.map((key, i) => {
            const Icon = RULE_ICONS[i];
            return (
              <li
                key={key}
                className="flex gap-3 rounded-xl border border-border dark:border-white/8 bg-muted/30 dark:bg-white/[0.02] px-3.5 py-3"
              >
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400 ring-1 ring-violet-500/20">
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <p className="text-[13px] leading-relaxed text-foreground/85 dark:text-white/70">
                  {t(key)}
                </p>
              </li>
            );
          })}
        </ul>

        {!readOnly ? (
          <div className="border-t border-border dark:border-white/8 px-6 py-4 space-y-4 bg-muted/20 dark:bg-white/[0.02]">
            <label className="flex cursor-pointer items-start gap-3 group">
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => setChecked(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-border accent-violet-500"
              />
              <span
                className={cn(
                  "text-[13px] leading-snug transition-colors",
                  checked
                    ? "text-foreground/90 dark:text-white/80"
                    : "text-muted-foreground dark:text-white/45 group-hover:text-muted-foreground dark:group-hover:text-white/60",
                )}
              >
                {t("comments.rules.agreeLabel")}
              </span>
            </label>
            <DialogFooter className="sm:justify-stretch gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1 border-border dark:border-white/12"
                onClick={() => onOpenChange(false)}
              >
                {t("comments.cancel")}
              </Button>
              <Button
                type="button"
                disabled={!checked}
                className="flex-1 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white border-0"
                onClick={handleAccept}
              >
                {t("comments.rules.accept")}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <DialogFooter className="border-t border-border dark:border-white/8 px-6 py-4 bg-muted/20 dark:bg-white/[0.02]">
            <Button
              type="button"
              className="w-full sm:w-auto bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white border-0"
              onClick={() => onOpenChange(false)}
            >
              {t("comments.rules.gotIt")}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
