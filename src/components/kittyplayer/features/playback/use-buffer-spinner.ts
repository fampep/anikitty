"use client";

/**
 * Debounced buffering spinner.
 *
 * A raw `waiting` event flickers on every short seek, so the spinner only arms
 * after the stall outlasts BUFFER_SPINNER_MS. Two cases skip the debounce and
 * arm immediately, because there is genuinely nothing to show yet: the initial
 * source load, and a media-driven seek the user did not start. Scrubbing never
 * arms it — the user is already looking at seek feedback.
 */

import { useEffect, useState } from "react";

import { BUFFER_SPINNER_MS } from "../../constants";

export function useBufferSpinner({
  buffering,
  sourceLoading,
  seeking,
  mediaSeeking,
}: {
  buffering: boolean;
  sourceLoading: boolean;
  /** User is dragging the seek bar. */
  seeking: boolean;
  /** The element is seeking without the user driving it. */
  mediaSeeking: boolean;
}): boolean {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (sourceLoading) {
      setArmed(true);
      return;
    }
    if (mediaSeeking && !seeking) {
      setArmed(true);
      return;
    }
    if (!buffering || seeking) {
      setArmed(false);
      return;
    }
    const timer = setTimeout(() => setArmed(true), BUFFER_SPINNER_MS);
    return () => clearTimeout(timer);
  }, [buffering, sourceLoading, seeking, mediaSeeking]);

  return armed;
}
