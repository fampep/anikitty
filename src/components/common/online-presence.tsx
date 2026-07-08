"use client";

import { useOnlineCount } from "@/hooks/use-online-count";

/**
 * Always-on presence heartbeat. Mounted once at the app root so EVERY visitor
 * — logged in or not, on any page (watching, browsing, landing) — is counted
 * from page load, not only when the footer's online widget scrolls into view.
 * Renders nothing.
 */
export default function OnlinePresence() {
  useOnlineCount(true);
  return null;
}
