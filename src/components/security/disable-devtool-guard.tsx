"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const IS_PROD = process.env.NODE_ENV === "production";

/** Paths where devtools should stay available (admin panel, etc.). */
function isExemptPath(pathname: string): boolean {
  return pathname.startsWith("/admin");
}

type DisableDevtoolApi = {
  (opts?: Record<string, unknown>): { success: boolean; reason: string };
  isRunning: boolean;
  isSuspend: boolean;
};

/**
 * Blocks F12, Ctrl+Shift+I, and other devtools entry points in production.
 * Context menu stays enabled for paste/accessibility.
 * Uses https://github.com/theajack/disable-devtool
 *
 * Optional bypass: set NEXT_PUBLIC_DISABLE_DEVTOOL_MD5 to md5(secret) and open any page with ?ddtk=secret
 */
export default function DisableDevtoolGuard() {
  const pathname = usePathname();
  const apiRef = useRef<DisableDevtoolApi | null>(null);

  useEffect(() => {
    if (!IS_PROD) return;

    let cancelled = false;

    void import("disable-devtool").then((mod) => {
      if (cancelled) return;
      const DisableDevtool = mod.default as DisableDevtoolApi;
      apiRef.current = DisableDevtool;

      if (!DisableDevtool.isRunning) {
        const md5 = process.env.NEXT_PUBLIC_DISABLE_DEVTOOL_MD5?.trim();
        DisableDevtool({
          ...(md5 ? { md5 } : {}),
          disableMenu: false,
          clearLog: true,
          disableCopy: false,
          disableCut: false,
          disablePaste: false,
          disableSelect: false,
          disableInputSelect: false,
          ignore: () => isExemptPath(window.location.pathname),
          ondevtoolopen(_type: unknown, next: () => void) {
            // Exempt paths stay usable; elsewhere redirect/block via disable-devtool.
            if (isExemptPath(window.location.pathname) || DisableDevtool.isSuspend) return;
            next();
          },
        });
      }

      DisableDevtool.isSuspend = isExemptPath(pathname);
    });

    return () => {
      cancelled = true;
      if (apiRef.current) {
        apiRef.current.isSuspend = isExemptPath(window.location.pathname);
      }
    };
  }, [pathname]);

  return null;
}
