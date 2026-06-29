"use client";

import Image from "next/image";
import { useEffect } from "react";
import ErrorImage from "@/assets/error.gif";
import { ROUTES } from "@/constants/routes";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/common/button-link";
import { useT } from "@/providers/i18n-provider";
import { getErrorMessage } from "@/lib/error-message";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useT();

  useEffect(() => {
    console.error(error);
  }, [error]);

  const detail = getErrorMessage(error) ?? error.digest;

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
        <div>
          <p className="font-bold text-2xl text-white">{t("common.error")}</p>
          {detail ? (
            <p className="text-sm text-white/55 mt-3 font-mono break-words max-w-lg leading-relaxed">
              {detail}
            </p>
          ) : null}
          <p className="text-sm text-white/35 mt-2 font-mono">{t("common.tryAgain")}</p>
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
