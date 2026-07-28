import { withAuth } from "@/lib/auth/auth-fetch";

export type FaqFeedbackVote = "yes" | "no";

export type FaqFeedbackEntry = {
  vote: FaqFeedbackVote;
  note?: string;
  at: string;
};

const STORAGE_KEY = "anikitty-faq-feedback-v1";

function readAll(): Record<string, FaqFeedbackEntry> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as Record<string, FaqFeedbackEntry>;
  } catch {
    return {};
  }
}

function writeAll(map: Record<string, FaqFeedbackEntry>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* quota / private mode */
  }
}

/** Sync cache read (local). Prefer `loadFaqFeedback` for server truth. */
export function getFaqFeedback(id: string): FaqFeedbackEntry | null {
  return readAll()[id] ?? null;
}

export async function loadFaqFeedback(id: string): Promise<FaqFeedbackEntry | null> {
  try {
    const res = await fetch(`/api/faq/feedback?articleId=${encodeURIComponent(id)}`, withAuth());
    if (res.ok) {
      const data = (await res.json()) as { feedback?: FaqFeedbackEntry | null };
      if (data.feedback) {
        const map = readAll();
        map[id] = data.feedback;
        writeAll(map);
        return data.feedback;
      }
    }
  } catch {
    /* offline / not migrated */
  }
  return getFaqFeedback(id);
}

export async function setFaqFeedback(
  id: string,
  vote: FaqFeedbackVote,
  note?: string,
): Promise<FaqFeedbackEntry> {
  const entry: FaqFeedbackEntry = {
    vote,
    at: new Date().toISOString(),
    ...(note?.trim() ? { note: note.trim().slice(0, 500) } : {}),
  };

  const map = readAll();
  map[id] = entry;
  writeAll(map);

  try {
    await fetch(
      "/api/faq/feedback",
      withAuth({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          articleId: id,
          helpful: vote === "yes",
          note: note?.trim() || undefined,
        }),
      }),
    );
  } catch {
    /* keep local cache */
  }

  return entry;
}
