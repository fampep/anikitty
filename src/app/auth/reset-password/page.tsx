"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Container from "@/components/layout/container";
import { KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/providers/i18n-provider";
import Link from "next/link";

function ResetPasswordForm() {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) router.replace("/home");
  }, [token, router]);

  const handleReset = async () => {
    if (!token) return;
    if (password.length < 8) {
      toast.error(t("auth.passwordMin"));
      return;
    }
    if (password !== confirm) {
      toast.error(t("auth.passwordMismatch"));
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/account/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? t("auth.resetFailed"));
        return;
      }
      toast.success(t("auth.resetSuccess"));
      router.replace("/home");
    } catch {
      toast.error(t("auth.resetFailed"));
    } finally {
      setLoading(false);
    }
  };

  if (!token) return null;

  return (
    <Container className="max-w-md pt-24 pb-24">
      <div className="rounded-2xl border border-border dark:border-white/10 bg-muted/30 dark:bg-white/[0.02] p-6 sm:p-8">
        <div className="flex items-center gap-2 text-zinc-300/80 mb-2">
          <KeyRound className="w-5 h-5" />
          <h1 className="text-lg font-bold text-foreground dark:text-white">
            {t("auth.resetTitle")}
          </h1>
        </div>
        <p className="text-sm text-muted-foreground dark:text-white/40 font-mono leading-relaxed mb-6">
          {t("auth.resetHint")}
        </p>
        <label className="text-[11px] font-mono text-muted-foreground dark:text-white/40 uppercase tracking-wider block mb-1.5">
          {t("settings.newPassword")}
        </label>
        <input
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full h-11 px-4 rounded-xl bg-muted/50 dark:bg-white/5 border border-border dark:border-white/10 text-foreground dark:text-white mb-3 focus:outline-none focus:border-primary/40 dark:focus:border-white/25"
        />
        <label className="text-[11px] font-mono text-muted-foreground dark:text-white/40 uppercase tracking-wider block mb-1.5">
          {t("auth.confirmPassword")}
        </label>
        <input
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void handleReset()}
          className="w-full h-11 px-4 rounded-xl bg-muted/50 dark:bg-white/5 border border-border dark:border-white/10 text-foreground dark:text-white mb-4 focus:outline-none focus:border-primary/40 dark:focus:border-white/25"
        />
        <button
          type="button"
          onClick={() => void handleReset()}
          disabled={loading || password.length < 8}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-60 text-primary-foreground font-semibold text-sm transition-colors"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
          {t("auth.resetSubmit")}
        </button>
        <p className="mt-4 text-center text-[12px] text-muted-foreground dark:text-white/35">
          <Link href="/home" className="hover:text-foreground dark:hover:text-white/70">
            {t("auth.backToSignIn")}
          </Link>
        </p>
      </div>
    </Container>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground dark:text-white/30" />
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
