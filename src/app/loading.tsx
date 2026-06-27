"use client";

import React from "react";
import { useT } from "@/providers/i18n-provider";

const Loading = () => {
  const t = useT();

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center gap-5 bg-background">
      <div className="relative">
        <div className="h-12 w-12 rounded-full border-2 border-white/[0.06]" />
        <div className="absolute inset-0 h-12 w-12 rounded-full border-2 border-transparent border-t-violet-400 animate-spin" />
      </div>
      <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-white/30 animate-pulse">
        {t("common.loading")}
      </p>
    </div>
  );
};

export default Loading;
