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
        "pointer-events-none absolute inset-x-0 top-0 -z-10 h-[min(72lvh,720px)] overflow-hidden",
        className,
      )}
      aria-hidden
    >
      <div className="relative size-full blur-2xl brightness-[0.35] dark:brightness-[0.12] scale-110">
        <Image src={imageUrl} alt="" fill sizes="100vw" className="object-cover object-top" priority />
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/40 to-background dark:via-[#0a0a0f]/60 dark:to-[#0a0a0f]" />
    </div>
  );
}
