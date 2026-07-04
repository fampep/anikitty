"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Loader2,
  LogIn,
  Mail,
  Send,
} from "lucide-react";
import Container from "@/components/layout/container";
import Avatar from "@/components/common/avatar";
import CommunityHero from "@/components/community/community-hero";
import LoginPopoverButton from "@/components/auth/login-popover-button";
import { ROUTES } from "@/constants/routes";
import { useAuthStore } from "@/store/auth-store";
import { useDmConversation } from "@/hooks/use-dm-conversation";
import { dmApi, dmTimeAgo, type DmConversation, type DmMessage } from "@/lib/social/dm";
import { useT } from "@/providers/i18n-provider";
import { cn } from "@/lib/core/utils";

export default function MessagesPage() {
  const t = useT();
  const router = useRouter();
  const params = useSearchParams();
  const { auth } = useAuthStore();
  const isLoggedIn = !!auth;

  const activeId = params.get("c");
  const targetUser = params.get("user");

  const [conversations, setConversations] = useState<DmConversation[]>([]);
  const [inboxLoading, setInboxLoading] = useState(true);

  const {
    conversation,
    messages,
    loading: threadLoading,
    sending,
    error,
    sendMessage,
  } = useDmConversation(activeId);

  const loadInbox = useCallback(async () => {
    if (!isLoggedIn) return;
    setInboxLoading(true);
    try {
      const data = await dmApi.listConversations();
      setConversations(data.conversations);
    } catch {
      toast.error(t("messages.loadFailed"));
    } finally {
      setInboxLoading(false);
    }
  }, [isLoggedIn, t]);

  useEffect(() => {
    loadInbox();
  }, [loadInbox]);

  useEffect(() => {
    if (!isLoggedIn || !targetUser || activeId) return;
    let cancelled = false;
    (async () => {
      try {
        const { conversation: conv } = await dmApi.openConversation(targetUser);
        if (!cancelled) {
          router.replace(`${ROUTES.MESSAGES}?c=${conv.id}`);
        }
      } catch (e: unknown) {
        if (!cancelled) {
          toast.error(e instanceof Error ? e.message : t("messages.openFailed"));
          router.replace(ROUTES.MESSAGES);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, targetUser, activeId, router, t]);

  useEffect(() => {
    if (conversation) {
      setConversations((prev) => {
        const others = prev.filter((c) => c.id !== conversation.id);
        return [conversation, ...others];
      });
    }
  }, [conversation]);

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen pt-page pb-24">
        <Container className="max-w-lg">
          <CommunityHero icon={<Mail className="w-5 h-5" />} title={t("messages.title")} subtitle={t("messages.subtitle")} />
          <div className="mt-8 flex flex-col items-center gap-4 rounded-2xl border border-border dark:border-white/10 bg-muted/30 dark:bg-white/[0.02] p-8 text-center">
            <LogIn className="h-8 w-8 text-muted-foreground/80 dark:text-white/25" />
            <p className="text-sm text-muted-foreground dark:text-white/50">{t("messages.signIn")}</p>
            <LoginPopoverButton />
          </div>
        </Container>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-page pb-24">
      <Container className="max-w-5xl flex flex-col gap-5">
        <CommunityHero icon={<Mail className="w-5 h-5" />} title={t("messages.title")} subtitle={t("messages.subtitle")} />

        <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-4 min-h-[60vh]">
          <div
            className={cn(
              "flex flex-col rounded-2xl border border-border dark:border-white/10 bg-black/40 overflow-hidden",
              activeId && "hidden md:flex",
            )}
          >
            <div className="px-4 py-3 border-b border-border dark:border-white/8 text-xs font-mono text-muted-foreground dark:text-white/40 uppercase tracking-wider">
              {t("messages.inbox")}
            </div>
            <div className="flex-1 overflow-y-auto">
              {inboxLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground dark:text-white/30" />
                </div>
              ) : conversations.length === 0 ? (
                <p className="py-12 px-4 text-center text-sm text-muted-foreground dark:text-white/35 font-mono">{t("messages.emptyInbox")}</p>
              ) : (
                conversations.map((c) => (
                  <Link
                    key={c.id}
                    href={`${ROUTES.MESSAGES}?c=${c.id}`}
                    className={cn(
                      "flex gap-3 px-4 py-3 border-b border-border/60 dark:border-white/5 hover:bg-muted/50 dark:bg-white/[0.04] transition-colors",
                      activeId === c.id && "bg-accent dark:bg-white/[0.06]",
                    )}
                  >
                    <Avatar username={c.otherUsername} url={c.otherAvatarUrl ?? undefined} className="h-10 w-10 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-foreground dark:text-white/85 truncate">@{c.otherUsername}</p>
                        <span className="text-[10px] font-mono text-muted-foreground dark:text-white/30 shrink-0">
                          {dmTimeAgo(c.lastActivityAt)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-0.5">
                        <p className="text-[11px] text-muted-foreground dark:text-white/40 truncate">{c.lastMessage ?? t("messages.noMessagesYet")}</p>
                        {c.unreadCount > 0 && (
                          <span className="shrink-0 rounded-full bg-violet-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                            {c.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>

          <div
            className={cn(
              "flex flex-col rounded-2xl border border-border dark:border-white/10 bg-black/40 overflow-hidden min-h-[50vh]",
              !activeId && "hidden md:flex",
            )}
          >
            {!activeId ? (
              <div className="flex flex-1 items-center justify-center p-8 text-center">
                <p className="text-sm text-muted-foreground dark:text-white/35 font-mono">{t("messages.selectConversation")}</p>
              </div>
            ) : threadLoading && messages.length === 0 ? (
              <div className="flex flex-1 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground dark:text-white/30" />
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 px-4 py-3 border-b border-border dark:border-white/8 shrink-0">
                  <Link
                    href={ROUTES.MESSAGES}
                    className="md:hidden p-1.5 rounded-lg text-muted-foreground dark:text-white/50 hover:text-foreground dark:hover:text-white hover:bg-accent dark:bg-white/8"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Link>
                  {conversation && (
                    <>
                      <Avatar
                        username={conversation.otherUsername}
                        url={conversation.otherAvatarUrl ?? undefined}
                        className="h-9 w-9"
                      />
                      <Link
                        href={`/profile/${conversation.otherUsername}`}
                        className="text-sm font-semibold text-foreground dark:text-white/85 hover:text-foreground dark:hover:text-white"
                      >
                        @{conversation.otherUsername}
                      </Link>
                    </>
                  )}
                </div>

                <DmThread messages={messages} />

                {error && (
                  <div className="px-4 py-2 text-xs text-red-400 bg-red-500/10 border-t border-red-500/20">{error}</div>
                )}

                <DmComposer
                  sending={sending}
                  onSend={async (body) => {
                    await sendMessage({ body });
                    loadInbox();
                  }}
                />
              </>
            )}
          </div>
        </div>
      </Container>
    </div>
  );
}

function DmThread({ messages }: { messages: DmMessage[] }) {
  const t = useT();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
      {messages.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground dark:text-white/35 py-8 font-mono">{t("messages.startConversation")}</p>
      ) : (
        messages.map((msg) => (
          <div
            key={msg.id}
            className={cn("flex gap-2 max-w-[85%]", msg.isOwn ? "ml-auto flex-row-reverse" : "mr-auto")}
          >
            <Avatar username={msg.username} url={msg.avatarUrl ?? undefined} className="h-8 w-8 shrink-0 mt-0.5" />
            <div className={cn("flex flex-col gap-0.5", msg.isOwn && "items-end")}>
              <div
                className={cn(
                  "px-3.5 py-2 rounded-2xl text-sm leading-relaxed break-words",
                  msg.isOwn
                    ? "bg-violet-600/90 text-white rounded-br-md"
                    : "bg-accent dark:bg-white/8 text-foreground dark:text-white/90 border border-border dark:border-white/8 rounded-bl-md",
                )}
              >
                {msg.body && <p className="whitespace-pre-wrap">{msg.body}</p>}
                {msg.gifUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={msg.gifUrl} alt="GIF" className="rounded-xl max-h-48 mt-1" />
                )}
              </div>
              <span className="text-[10px] text-muted-foreground dark:text-white/30 px-1">{dmTimeAgo(msg.createdAt)}</span>
            </div>
          </div>
        ))
      )}
      <div ref={bottomRef} />
    </div>
  );
}

function DmComposer({
  sending,
  onSend,
}: {
  sending: boolean;
  onSend: (body: string) => Promise<void>;
}) {
  const t = useT();
  const [draft, setDraft] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;
    try {
      await onSend(body);
      setDraft("");
    } catch {
      // error surfaced by hook
    }
  };

  return (
    <form onSubmit={handleSubmit} className="border-t border-border dark:border-white/8 p-3 flex gap-2 shrink-0">
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={t("messages.placeholder")}
        maxLength={1000}
        className="flex-1 rounded-xl px-4 py-2.5 text-sm bg-muted/60 dark:bg-muted/60 dark:bg-white/6 border border-border dark:border-white/10 text-foreground dark:text-white placeholder:text-muted-foreground dark:placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-border dark:ring-white/20"
      />
      <button
        type="submit"
        disabled={!draft.trim() || sending}
        className="shrink-0 flex items-center justify-center h-10 w-10 rounded-xl bg-violet-600 text-white hover:bg-violet-500 disabled:opacity-40"
      >
        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
      </button>
    </form>
  );
}
