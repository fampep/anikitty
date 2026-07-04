"use client";

import { useCallback, useEffect, useState } from "react";
import {
  readCommentRulesAccepted,
  writeCommentRulesAccepted,
} from "@/lib/comments/comment-rules-storage";

export function useCommentRulesAccepted() {
  const [accepted, setAccepted] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setAccepted(readCommentRulesAccepted());
    setReady(true);
  }, []);

  const accept = useCallback(() => {
    writeCommentRulesAccepted();
    setAccepted(true);
  }, []);

  return { accepted, ready, accept };
}
