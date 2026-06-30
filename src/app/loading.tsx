"use client";

import React from "react";
import LoadingGirl from "@/components/common/loading-girl";
import { useT } from "@/providers/i18n-provider";

const Loading = () => {
  const t = useT();

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center gap-5 bg-background">
      <LoadingGirl size={200} label={t("common.loading")} />
    </div>
  );
};

export default Loading;
