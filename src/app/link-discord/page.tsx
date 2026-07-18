"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Container from "@/components/layout/container";
import LoginPopoverButton from "@/components/auth/login-popover-button";
import { useAuthStore, useAuthHydrated } from "@/store/auth-store";
import { withAuth } from "@/lib/auth/auth-fetch";
import { ROUTES } from "@/constants/routes";
import { CheckCircle2, LinkIcon, Loader2, XCircle } from "lucide-react";
import Link from "next/link";

type Preview =
  | {
      ok: true;
      discordId: string;
      discordUsername: string | null;
      alreadyLinked: boolean;
      sameDiscord: boolean;
    }
  | { ok: false; message: string };

function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

function LinkDiscordInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const code = searchParams.get("code")?.trim() ?? "";
  const { auth } = useAuthStore();
  const hydrated = useAuthHydrated();

  const [preview, setPreview] = useState<Preview | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPreview = useCallback(async () => {
    if (!code || !auth) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/account/auth/discord/link-code?code=${encodeURIComponent(code)}`,
        withAuth(),
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPreview({
          ok: false,
          message: body?.message ?? body?.error ?? "This link is invalid or expired.",
        });
        return;
      }
      setPreview({
        ok: true,
        discordId: body.discordId,
        discordUsername: body.discordUsername ?? null,
        alreadyLinked: !!body.alreadyLinked,
        sameDiscord: !!body.sameDiscord,
      });
    } catch {
      setPreview({ ok: false, message: "Could not load this link. Try again." });
    } finally {
      setLoading(false);
    }
  }, [auth, code]);

  useEffect(() => {
    if (!hydrated) return;
    if (!code) {
      setLoading(false);
      setPreview({ ok: false, message: "Missing link code. Run /link in Discord again." });
      return;
    }
    if (!auth) {
      setLoading(false);
      setPreview(null);
      return;
    }
    void loadPreview();
  }, [hydrated, auth, code, loadPreview]);

  const handleConfirm = async () => {
    if (!code || !auth) return;
    setConfirming(true);
    setError(null);
    try {
      const res = await fetch(
        "/api/account/auth/discord/link-code",
        withAuth({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        }),
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body?.message ?? body?.error ?? "Link failed");
        return;
      }
      setDone(true);
      setTimeout(() => router.push(`${ROUTES.SETTINGS}?tab=connections&discord=connected`), 1200);
    } catch {
      setError("Link failed — try again.");
    } finally {
      setConfirming(false);
    }
  };

  return (
    <Container className="max-w-md pt-24 pb-24">
      <div className="rounded-2xl border border-border dark:border-white/10 bg-muted/30 dark:bg-white/[0.02] p-6 sm:p-8">
        <div className="flex items-center gap-2 text-zinc-300/80 mb-2">
          <DiscordIcon className="w-5 h-5 text-[#5865F2]" />
          <h1 className="text-lg font-bold text-foreground dark:text-white">Link Discord</h1>
        </div>
        <p className="text-sm text-muted-foreground dark:text-white/40 font-mono leading-relaxed mb-6">
          Confirm to connect your Discord account to AniKitty. Roles sync after linking.
        </p>

        {!hydrated || loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : !auth ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground dark:text-white/50">
              Sign in to AniKitty to finish linking Discord.
            </p>
            <LoginPopoverButton />
          </div>
        ) : done ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-400" />
            <p className="text-sm font-medium text-foreground dark:text-white">Discord linked</p>
            <p className="text-xs text-muted-foreground">Redirecting to settings…</p>
          </div>
        ) : preview && !preview.ok ? (
          <div className="flex flex-col items-center gap-2 py-4 text-center">
            <XCircle className="w-8 h-8 text-rose-400" />
            <p className="text-sm text-muted-foreground">{preview.message}</p>
            <Link
              href={`${ROUTES.SETTINGS}?tab=connections`}
              className="text-sm text-primary hover:underline mt-2"
            >
              Open Settings → Connections
            </Link>
          </div>
        ) : preview?.ok ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-border dark:border-white/10 bg-background/50 p-4">
              <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground mb-1">
                Discord account
              </p>
              <p className="text-sm font-semibold text-foreground dark:text-white">
                {preview.discordUsername ?? `ID ${preview.discordId}`}
              </p>
            </div>

            {preview.sameDiscord ? (
              <p className="text-sm text-emerald-400/90">Already linked to this Discord account.</p>
            ) : preview.alreadyLinked ? (
              <p className="text-sm text-amber-400/90">
                Your AniKitty account already has a different Discord linked. Unlink it in Settings
                first.
              </p>
            ) : (
              <button
                type="button"
                onClick={handleConfirm}
                disabled={confirming}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] disabled:opacity-60 text-white font-semibold text-sm transition-colors"
              >
                {confirming ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <LinkIcon className="w-4 h-4" />
                )}
                Confirm link
              </button>
            )}

            {error && <p className="text-sm text-rose-400">{error}</p>}
          </div>
        ) : null}
      </div>
    </Container>
  );
}

export default function LinkDiscordPage() {
  return (
    <Suspense
      fallback={
        <Container className="max-w-md pt-24 pb-24 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </Container>
      }
    >
      <LinkDiscordInner />
    </Suspense>
  );
}
