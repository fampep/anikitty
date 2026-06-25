"use client";
import { useEffect, useState } from "react";

function getOrCreateSid(): string {
  try {
    let sid = sessionStorage.getItem("kk-sid");
    if (!sid) {
      sid = crypto.randomUUID();
      sessionStorage.setItem("kk-sid", sid);
    }
    return sid;
  } catch {
    return crypto.randomUUID();
  }
}

export function useOnlineCount() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    const sid = getOrCreateSid();

    const beat = async () => {
      try {
        const res = await fetch("/api/online", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: sid }),
        });
        const data = await res.json();
        setCount(data.count);
      } catch {}
    };

    beat();
    const iv = setInterval(beat, 30_000);

    const onUnload = () => {
      navigator.sendBeacon(
        "/api/online",
        new Blob(
          [JSON.stringify({ sessionId: sid, action: "leave" })],
          { type: "application/json" },
        ),
      );
    };
    window.addEventListener("beforeunload", onUnload);

    return () => {
      clearInterval(iv);
      window.removeEventListener("beforeunload", onUnload);
    };
  }, []);

  return count;
}
