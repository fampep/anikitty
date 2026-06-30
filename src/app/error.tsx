"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import LoadingGirl from "@/components/common/loading-girl";
import ErrorImage from "@/assets/error.gif";
import { ROUTES } from "@/constants/routes";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/common/button-link";
import { useT } from "@/providers/i18n-provider";
import { getErrorMessage } from "@/lib/core/error-message";

const AUTO_RETRY_MS = 2500;

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useT();
  const [showError, setShowError] = useState(false);

  useEffect(() => {
    console.error(error);

    const retryKey = "anikitty-error-auto-retry";
    const lastRetry = Number(sessionStorage.getItem(retryKey) || 0);
    const now = Date.now();

    if (now - lastRetry > AUTO_RETRY_MS) {
      sessionStorage.setItem(retryKey, String(now));
      reset();
      return;
    }

    sessionStorage.removeItem(retryKey);
    setShowError(true);
  }, [error, reset]);

  if (!showError) {
    return (
      <div className="min-h-[100dvh] w-full bg-black flex items-center justify-center px-6">
        <LoadingGirl size={180} label={t("common.loading")} />
      </div>
    );
  }

  const detail = getErrorMessage(error);

  return (
    <div className="min-h-[100dvh] w-full bg-black flex items-center justify-center px-6">
      <div className="flex flex-col items-center gap-5 text-center max-w-md">
        <Image
          src={ErrorImage.src}
          alt=""
          width={220}
          height={220}
          className="opacity-90"
        />
        <div className="w-full rounded-xl border border-rose-500/20 bg-[#0a0a0a] px-5 py-4">
          <p className="font-bold text-2xl text-white">{t("common.error")}</p>
          <p className="text-sm font-mono text-rose-400 mt-3 break-words leading-relaxed">
            {detail}
          </p>
          <p className="text-sm text-white/35 mt-3 font-mono">{t("common.tryAgain")}</p>
        </div>
        <div className="flex gap-3 items-center flex-wrap justify-center">
          <ButtonLink href={ROUTES.HOME}>{t("common.backHome")}</ButtonLink>
          <Button onClick={() => reset()} variant="secondary">
            {t("common.reload")}
          </Button>
        </div>
      </div>
    </div>
  );
}
