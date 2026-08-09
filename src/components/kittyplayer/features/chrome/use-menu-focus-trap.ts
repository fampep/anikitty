"use client";

/**
 * Focus trap for the opaque control-bar menus.
 *
 * Tab cycles inside the open menu; Escape is handled by the global keyboard
 * handler. On close, focus returns to the trigger that opened the menu (falling
 * back to whatever was focused before), so keyboard users are not dumped at the
 * top of the document.
 *
 * Panels are checked in order and the first open one wins, which is what makes
 * overlapping state safe — only one menu is ever trapped at a time.
 */

import { useEffect, type RefObject } from "react";

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export type FocusTrapPanel = {
  open: boolean;
  menuRef: RefObject<HTMLElement | null>;
  triggerRef: RefObject<HTMLElement | null>;
};

export function useMenuFocusTrap(panels: readonly FocusTrapPanel[]): void {
  // Depend on the open flags rather than the array identity — callers build a
  // fresh array every render and refs are stable.
  const openKey = panels.map((p) => (p.open ? "1" : "0")).join("");

  useEffect(() => {
    const active = panels.find((p) => p.open);
    if (!active) return;

    const menu = active.menuRef.current;
    if (!menu) return;

    const focusables = Array.from(menu.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
    const previouslyFocused = document.activeElement as HTMLElement | null;
    focusables[0]?.focus({ preventScroll: true });

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (!first || !last) return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    menu.addEventListener("keydown", onKeyDown);
    return () => {
      menu.removeEventListener("keydown", onKeyDown);
      (active.triggerRef.current ?? previouslyFocused)?.focus?.({ preventScroll: true });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on open flags; refs are stable
  }, [openKey]);
}
