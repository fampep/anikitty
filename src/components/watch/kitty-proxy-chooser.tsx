"use client";

import React from "react";
import { cn } from "@/lib/core/utils";
import { KITTY_API_NODES } from "@/lib/kitty/kitty-api-nodes";
import { useSettingsStore } from "@/store/settings-store";
import { useT } from "@/providers/i18n-provider";
import { Globe2 } from "lucide-react";

export default function KittyProxyChooser() {
  const t = useT();
  const kittyProxyNode = useSettingsStore((s) => s.kittyProxyNode);
  const setKittyProxyNode = useSettingsStore((s) => s.setKittyProxyNode);

  return (
    <div className="rounded-xl border border-white/[0.08] bg-black/20 px-3 py-3 space-y-2.5">
      <div className="flex items-center gap-2">
        <Globe2 className="w-3.5 h-3.5 text-sky-400/80 shrink-0" />
        <div className="min-w-0">
          <p className="text-[11px] font-bold text-white/75">{t("watch.playerSettings.proxyChooser")}</p>
          <p className="text-[10px] text-white/30 mt-0.5 leading-snug">
            {t("watch.playerSettings.proxyChooserDesc")}
          </p>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {KITTY_API_NODES.map((node) => {
          const selected = kittyProxyNode === node.id;
          return (
            <button
              key={node.id}
              type="button"
              onClick={() => setKittyProxyNode(node.id)}
              className={cn(
                "rounded-xl border px-3 py-2.5 text-left transition-colors",
                selected
                  ? "border-sky-400/35 bg-sky-500/10 ring-1 ring-sky-400/20"
                  : "border-white/[0.08] bg-white/[0.03] hover:border-white/14 hover:bg-white/[0.05]",
              )}
            >
              <p className={cn("text-[12px] font-medium", selected ? "text-white/90" : "text-white/65")}>
                {node.location}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
