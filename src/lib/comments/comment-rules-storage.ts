export const COMMENT_RULES_STORAGE_KEY = "anikitty-comment-rules-v1";

export function readCommentRulesAccepted(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(COMMENT_RULES_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeCommentRulesAccepted(): void {
  try {
    localStorage.setItem(COMMENT_RULES_STORAGE_KEY, "1");
  } catch {
    /* ignore quota / private mode */
  }
}
