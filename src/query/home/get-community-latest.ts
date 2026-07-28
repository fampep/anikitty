import { GET_LATEST_COMMENTS, GET_LATEST_FORUM } from "@/constants/query-keys";
import type { ForumThread } from "@/lib/social/forum";
import { useQuery } from "@tanstack/react-query";

export type LatestCommentItem = {
  id: string;
  body: string;
  gifUrl: string | null;
  isSpoiler?: boolean;
  likeCount?: number;
  animeId: string;
  animeTitle?: string | null;
  episodeId?: string | null;
  episodeNumber?: number | null;
  createdAt: string;
  username: string;
  avatarUrl: string | null;
  role: string | null;
  roleColor: string | null;
  level?: number;
  levelRole?: string;
  levelRoleColor?: string;
  equippedFrame?: string | null;
  equippedIcon?: string | null;
};

const communityQueryDefaults = {
  refetchOnWindowFocus: false,
  refetchOnMount: false,
  staleTime: 60_000,
  gcTime: 5 * 60_000,
} as const;

async function fetchLatestComments(limit = 8): Promise<LatestCommentItem[]> {
  const res = await fetch(`/api/comments/latest?limit=${limit}`);
  if (!res.ok) throw new Error("Failed to load comments");
  const data = await res.json();
  return data.comments ?? [];
}

async function fetchLatestForum(): Promise<ForumThread[]> {
  const res = await fetch("/api/forum/latest");
  if (!res.ok) throw new Error("Failed to load forum");
  const data = await res.json();
  return data.threads ?? [];
}

export function useLatestComments(limit = 8, enabled = true) {
  return useQuery({
    queryKey: [GET_LATEST_COMMENTS, limit],
    queryFn: () => fetchLatestComments(limit),
    enabled,
    ...communityQueryDefaults,
  });
}

export function useLatestForum(enabled = true) {
  return useQuery({
    queryKey: [GET_LATEST_FORUM],
    queryFn: fetchLatestForum,
    enabled,
    ...communityQueryDefaults,
  });
}
