"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/core/utils";

type Props = {
  src: string;
  alt?: string;
  imageClassName?: string;
  sizes?: string;
  priority?: boolean;
  root?: Element | null;
};

/** Defer poster decode until near the viewport (or scroll row). */
export default function LazyPosterImage({
  src,
  alt = "",
  imageClassName,
  sizes = "(max-width: 640px) 50vw, 200px",
  priority = false,
  root = null,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(priority);

  useEffect(() => {
    if (priority || !src) return;

    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { root, rootMargin: "240px 320px", threshold: 0.01 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [priority, root, src]);

  return (
    <div ref={ref} className="absolute inset-0">
      {visible && src ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          className={cn("object-cover", imageClassName)}
        />
      ) : (
        <div className="absolute inset-0 bg-white/[0.04]" aria-hidden />
      )}
    </div>
  );
}
