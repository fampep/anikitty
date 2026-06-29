"use client";

import { Suspense } from "react";
import MessagesPage from "@/components/messages/messages-content";
import { Loader2 } from "lucide-react";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen pt-page flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-white/30" />
        </div>
      }
    >
      <MessagesPage />
    </Suspense>
  );
}
