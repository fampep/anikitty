"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const IS_PROD = process.env.NODE_ENV === "production";

/** Paths where devtools should stay available (admin panel, etc.). */
function isExemptPath(pathname: string): boolean {
  return pathname.startsWith("/admin");
}

/**
 * Blocks F12, Ctrl+Shift+I, right-click menu, and other devtools entry points in production.
 * Uses https://github.com/theajack/disable-devtool
 *
 * Optional bypass: set NEXT_PUBLIC_DISABLE_DEVTOOL_MD5 to md5(secret) and open any page with ?ddtk=secret
 */
export default function DisableDevtoolGuard() {
  const pathname = usePathname();
  const startedRef = useRef(false);

  useEffect(() => {
    if (!IS_PROD || isExemptPath(pathname)) return;

    let cancelled = false;

    void import("disable-devtool").then((mod) => {
      if (cancelled || startedRef.current) return;
      startedRef.current = true;

      const DisableDevtool = mod.default;
      const md5 = process.env.NEXT_PUBLIC_DISABLE_DEVTOOL_MD5?.trim();

      DisableDevtool({
        ...(md5 ? { md5 } : {}),
        disableMenu: true,
        clearLog: true,
        disableCopy: false,
        disableCut: false,
        disablePaste: false,
        disableSelect: false,
        disableInputSelect: false,
        ignore: () => isExemptPath(window.location.pathname),
        ondevtoolopen(_type, next) {
          next();
        },
      });
    });

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return null;
}
