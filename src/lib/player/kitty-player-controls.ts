import type { Option } from "artplayer";

type SeekControlLabels = {
  back: string;
  forward: string;
};

function seekButtonHtml(seconds: number, direction: "back" | "forward"): string {
  const rotate = direction === "back" ? "transform:rotate(180deg)" : "";
  return `<div class="kitty-seek-control" style="display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1;min-width:2.1rem;padding:0 2px;color:inherit">
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" style="${rotate}" aria-hidden="true">
      <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-8-3.58-8-8z"/>
    </svg>
    <span style="font-size:9px;font-weight:700;font-family:ui-monospace,monospace;margin-top:1px">${seconds}</span>
  </div>`;
}

/** Rewind / fast-forward buttons for the ArtPlayer control bar. */
export function buildKittySeekControls(
  getStepSeconds: () => number,
  labels: SeekControlLabels,
): NonNullable<Option["controls"]> {
  const syncLabel = (element: HTMLElement, direction: "back" | "forward") => {
    const seconds = getStepSeconds();
    element.innerHTML = seekButtonHtml(seconds, direction);
    element.setAttribute("aria-label", direction === "back" ? labels.back : labels.forward);
  };

  return [
    {
      name: "kitty-seek-back",
      position: "left",
      index: 9,
      html: seekButtonHtml(getStepSeconds(), "back"),
      tooltip: labels.back,
      click() {
        this.backward = getStepSeconds();
      },
      mounted(element) {
        syncLabel(element, "back");
      },
    },
    {
      name: "kitty-seek-forward",
      position: "left",
      index: 11,
      html: seekButtonHtml(getStepSeconds(), "forward"),
      tooltip: labels.forward,
      click() {
        this.forward = getStepSeconds();
      },
      mounted(element) {
        syncLabel(element, "forward");
      },
    },
  ];
}
