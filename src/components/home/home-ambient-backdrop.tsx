"use client";

import Image from "next/image";
import { cn } from "@/lib/core/utils";

type Props = {
  imageUrl?: string;
  className?: string;
};

export default function HomeAmbientBackdrop({ imageUrl, className }: Props) {
  if (!imageUrl) return null;

  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-0 -z-30 w-screen overflow-hidden blur-2xl brightness-[0.35] dark:brightness-[0.12]",
        className,
      )}
      aria-hidden
    >
      <div className="relative size-full scale-110">
        <Image src={imageUrl} alt="" fill sizes="100vw" className="object-cover object-top" priority />
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-background/20 via-background/60 to-background dark:from-[#0a0a0f]/30 dark:via-[#0a0a0f]/75 dark:to-[#0a0a0f]" />
    </div>
  );
}
