const LINE_CLASS = "kitty-sub-line";

/** Split Artplayer subtitle text into display lines. */
export function splitSubtitleDisplayLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function renderBoxedSubtitleLines(subEl: HTMLElement, lines: string[]) {
  subEl.replaceChildren(
    ...lines.map((line) => {
      const span = document.createElement("span");
      span.className = LINE_CLASS;
      span.textContent = line;
      return span;
    }),
  );
}

/**
 * Wrap each subtitle line in its own boxed span (anime-style per-line backgrounds).
 * Returns a cleanup function.
 */
export function installBoxedSubtitleLineFormatter(subEl: HTMLElement): () => void {
  let formatting = false;
  let lastRendered = "";

  const format = () => {
    if (formatting) return;

    const lines = splitSubtitleDisplayLines(subEl.innerText);
    const signature = lines.join("\n");
    if (signature === lastRendered) return;

    formatting = true;
    if (lines.length === 0) {
      subEl.replaceChildren();
    } else {
      renderBoxedSubtitleLines(subEl, lines);
    }
    lastRendered = signature;
    formatting = false;
  };

  format();
  let rafId: number | null = null;
  const observer = new MutationObserver(() => {
    if (rafId != null) return;
    rafId = requestAnimationFrame(() => {
      rafId = null;
      format();
    });
  });
  observer.observe(subEl, { childList: true, characterData: true, subtree: true });

  return () => {
    if (rafId != null) cancelAnimationFrame(rafId);
    observer.disconnect();
    subEl.replaceChildren();
    lastRendered = "";
  };
}
