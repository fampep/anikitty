"use client";

import React, { useState } from "react";
import { pb } from "@/lib/pocketbase";
import { useAuthStore } from "@/store/auth-store";
import { toast } from "sonner";
import { api } from "@/lib/api";
import useBookMarks from "@/hooks/use-get-bookmark";
import { Check, Link2, Link2Off, Loader2, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import AnilistIcon from "@/icons/anilist";

const ANILIST_STATUS_MAP: Record<string, string> = {
  CURRENT:   "watching",
  COMPLETED: "completed",
  PLANNING:  "plan to watch",
  DROPPED:   "dropped",
  PAUSED:    "on hold",
  REPEATING: "watching",
};

async function fetchAniListList(username: string) {
  const res = await fetch("https://graphql.anilist.co", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      query: `query ($username: String) {
        MediaListCollection(type: ANIME, userName: $username) {
          lists { name status entries { media { id title { english romaji } bannerImage } } }
        }
      }`,
      variables: { username },
    }),
  });
  const json = await res.json();
  if (json.errors) throw new Error(json.errors[0].message);
  return json.data.MediaListCollection.lists as Array<{
    name: string;
    status: string;
    entries: Array<{ media: { id: number; title: { english?: string; romaji?: string }; bannerImage?: string } }>;
  }>;
}

function AnilistConnect() {
  const { auth, setAuth } = useAuthStore();
  const { createOrUpdateBookMark } = useBookMarks({ populate: false });

  const [input, setInput] = useState("");
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ imported: number; skipped: number } | null>(null);

  const connected = auth?.anilistUsername;

  const persistAnilistUsername = async (username: string) => {
    await pb.collection("users").update(auth!.id, { anilistUsername: username });
    setAuth({ ...auth!, anilistUsername: username });
  };

  const runSync = async (username: string) => {
    const lists = await fetchAniListList(username);

    // Flatten entries with their status
    const entries = lists.flatMap((list) =>
      list.entries.map((e) => ({
        media: e.media,
        status: ANILIST_STATUS_MAP[list.status] ?? "watching",
      })),
    );

    // Map AniList IDs to our internal IDs via the import route
    const { data } = await api.post("/api/import/anilist", {
      animes: lists,
    });

    if (!data?.animes?.length) return { imported: 0, skipped: entries.length };

    let imported = 0;
    for (const anime of data.animes) {
      const status = entries.find(
        (e) =>
          e.media.title.english === anime.title ||
          e.media.title.romaji === anime.title,
      )?.status ?? "watching";
      await createOrUpdateBookMark(anime.id, anime.title, anime.thumbnail, status, false);
      imported++;
    }
    return { imported, skipped: entries.length - imported };
  };

  const handleConnect = async () => {
    const username = input.trim();
    if (!username) return;
    setLoading(true);
    try {
      // Verify the username exists on AniList
      await fetchAniListList(username);
      await persistAnilistUsername(username);

      // Initial sync
      setSyncing(true);
      const result = await runSync(username);
      setSyncResult(result);
      toast.success(`Connected & synced! ${result.imported} anime imported.`);
      setEditing(false);
      setInput("");
    } catch (e: any) {
      toast.error(e?.message?.includes("not found") ? "AniList user not found" : "Failed to connect AniList");
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  };

  const handleSync = async () => {
    if (!connected) return;
    setSyncing(true);
    try {
      const result = await runSync(connected);
      setSyncResult(result);
      toast.success(`Synced! ${result.imported} anime updated.`);
    } catch {
      toast.error("Sync failed. Try again.");
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await pb.collection("users").update(auth!.id, { anilistUsername: "" });
      setAuth({ ...auth!, anilistUsername: undefined });
      setSyncResult(null);
      toast.success("AniList disconnected");
    } catch {
      toast.error("Failed to disconnect");
    }
  };

  return (
    <div className="w-full rounded-xl border border-green-900/30 bg-green-950/10 p-4 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="w-4 h-4 inline-flex items-center justify-center [&_svg]:w-full [&_svg]:h-full"><AnilistIcon /></span>
        <span className="text-xs font-bold text-green-300 uppercase tracking-wider font-mono">AniList</span>
        {connected && (
          <span className="ml-auto flex items-center gap-1 text-[10px] text-emerald-400 font-mono">
            <Check className="w-3 h-3" /> linked
          </span>
        )}
      </div>

      {/* Connected state */}
      {connected && !editing && (
        <>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#02112b] border border-[#1a3a6a]/60">
            <span className="text-[#00b4ff] text-sm font-semibold truncate flex-1">@{connected}</span>
          </div>

          {syncResult && (
            <p className="text-[10px] text-green-700 font-mono">
              Last sync: {syncResult.imported} imported, {syncResult.skipped} skipped
            </p>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-[#1a3a6a]/60 bg-[#02112b] hover:bg-[#031a40] text-[#00b4ff] text-xs font-semibold transition-colors disabled:opacity-50"
            >
              {syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              {syncing ? "Syncing…" : "Sync now"}
            </button>
            <button
              onClick={() => setEditing(true)}
              className="px-3 py-1.5 rounded-lg border border-green-900/40 text-green-700 hover:text-green-400 text-xs transition-colors"
            >
              Change
            </button>
            <button
              onClick={handleDisconnect}
              className="px-3 py-1.5 rounded-lg border border-red-900/40 text-red-700 hover:text-red-400 text-xs transition-colors"
            >
              <Link2Off className="w-3.5 h-3.5" />
            </button>
          </div>
        </>
      )}

      {/* Not connected / editing */}
      {(!connected || editing) && (
        <>
          <p className="text-[11px] text-green-700 leading-relaxed">
            {editing ? "Enter your new AniList username:" : "Link your AniList account to sync your watchlist automatically."}
          </p>
          <div className="flex gap-2">
            <Input
              placeholder="AniList username"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleConnect()}
              className="flex-1 bg-green-950/30 border-green-900/60 text-green-100 placeholder:text-green-800 text-sm h-8 focus:border-green-600 focus:ring-0"
            />
            <button
              onClick={handleConnect}
              disabled={loading || !input.trim()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white text-xs font-semibold transition-colors"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Link2 className="w-3.5 h-3.5" />}
              {loading ? "…" : "Link"}
            </button>
          </div>
          {editing && (
            <button onClick={() => { setEditing(false); setInput(""); }} className="text-xs text-green-800 hover:text-green-600 text-left">
              Cancel
            </button>
          )}
        </>
      )}
    </div>
  );
}

export default AnilistConnect;
