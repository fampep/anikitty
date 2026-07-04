import Image from "next/image";
import loadingGirl from "@/assets/loading-girl.png";
import { cn } from "@/lib/core/utils";

type LoadingGirlProps = {
  size?: number;
  className?: string;
  label?: string;
};

export default function LoadingGirl({ size = 180, className, label }: LoadingGirlProps) {
  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      <Image
        src={loadingGirl}
        alt=""
        width={size}
        height={size}
        className="drop-shadow-[0_0_24px_rgba(236,72,153,0.35)]"
        unoptimized
        priority
      />
      {label ? (
        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground dark:text-white/30 animate-pulse">
          {label}
        </p>
      ) : null}
    </div>
  );
}
