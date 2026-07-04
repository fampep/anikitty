"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Container from "@/components/layout/container";
import { Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { anisurgeAuth, authFromMeResponse } from "@/lib/oauth/anisurge";
import { useAuthStore } from "@/store/auth-store";
import { useT } from "@/providers/i18n-provider";

function TwoFactorForm() {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAuth } = useAuthStore();
  const [totpCode, setTotpCode] = useState("");
  const [loading, setLoading] = useState(false);
  const token = searchParams.get("token");

  useEffect(() => {
    if (!token) router.replace("/home");
  }, [token, router]);

  const handleVerify = async () => {
    if (!token || totpCode.length !== 6) {
      toast.error(t("auth.enterTotp"));
      return;
    }
    setLoading(true);
    try {
      const data = await anisurgeAuth.verify2fa(token, totpCode);
      setAuth(authFromMeResponse(data));
      toast.success(t("auth.welcomeBack"));
      router.replace("/home");
    } catch (e: unknown) {
      const err = e as { body?: { error?: string } };
      toast.error(err?.body?.error ?? t("auth.invalidTotp"));
    } finally {
      setLoading(false);
    }
  };

  if (!token) return null;

  return (
    <Container className="max-w-md pt-24 pb-24">
      <div className="rounded-2xl border border-border dark:border-white/10 bg-muted/30 dark:bg-white/[0.02] p-6 sm:p-8">
        <div className="flex items-center gap-2 text-violet-300/80 mb-2">
          <ShieldCheck className="w-5 h-5" />
          <h1 className="text-lg font-bold text-foreground dark:text-white">{t("auth.twoFactor")}</h1>
        </div>
        <p className="text-sm text-muted-foreground dark:text-white/40 font-mono leading-relaxed mb-6">
          {t("auth.twoFactorHint")}
        </p>
        <label className="text-[11px] font-mono text-muted-foreground dark:text-white/40 uppercase tracking-wider block mb-1.5">
          {t("auth.authCode")}
        </label>
        <input
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          value={totpCode}
          onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          onKeyDown={(e) => e.key === "Enter" && handleVerify()}
          placeholder="000000"
          className="w-full h-11 px-4 rounded-xl bg-muted/50 dark:bg-white/5 border border-border dark:border-white/10 text-foreground dark:text-white text-center text-lg tracking-[0.3em] font-mono focus:outline-none focus:border-primary/40 dark:focus:border-white/25 mb-4"
        />
        <button
          onClick={handleVerify}
          disabled={loading || totpCode.length !== 6}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white font-semibold text-sm transition-colors"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
          {t("auth.verifySignIn")}
        </button>
      </div>
    </Container>
  );
}

export default function Auth2faPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground dark:text-white/30" />
        </div>
      }
    >
      <TwoFactorForm />
    </Suspense>
  );
}
