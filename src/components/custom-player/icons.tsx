import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/** Filled triangle for the bottom control strip. */
export function PlayIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden {...props}>
      <path d="M8 5.5v13L19 12 8 5.5z" fill="currentColor" />
    </svg>
  );
}

/** Outline triangle for the large center overlay button. */
export function PlayOutlineIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden {...props}>
      <path {...stroke} d="M9 7v10l9-5-9-5z" />
    </svg>
  );
}

export function PauseIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden {...props}>
      <path {...stroke} strokeWidth={2} d="M9 6.5v11M15 6.5v11" />
    </svg>
  );
}

/** Simple double-triangle seek back (no numeral). */
export function SeekBackIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden {...props}>
      <path fill="currentColor" d="M11.5 6.8v10.4L4.8 12l6.7-5.2z" />
      <path fill="currentColor" d="M19.2 6.8v10.4L12.5 12l6.7-5.2z" />
    </svg>
  );
}

/** Simple double-triangle seek forward (no numeral). */
export function SeekForwardIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden {...props}>
      <path fill="currentColor" d="M12.5 6.8v10.4L19.2 12l-6.7-5.2z" />
      <path fill="currentColor" d="M4.8 6.8v10.4L11.5 12 4.8 6.8z" />
    </svg>
  );
}

export function VolumeIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden {...props}>
      <path {...stroke} d="M5 9.5v5h3.25L13 18.5V5.5L8.25 9.5H5z" />
      <path {...stroke} d="M16 9.75a2.75 2.75 0 0 1 0 4.5" />
      <path {...stroke} d="M18.25 7.5a5.5 5.5 0 0 1 0 9" />
    </svg>
  );
}

export function VolumeLowIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden {...props}>
      <path {...stroke} d="M5 9.5v5h3.25L13 18.5V5.5L8.25 9.5H5z" />
      <path {...stroke} d="M16 9.75a2.75 2.75 0 0 1 0 4.5" />
    </svg>
  );
}

export function VolumeMuteIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden {...props}>
      <path {...stroke} d="M5 9.5v5h3.25L13 18.5V5.5L8.25 9.5H5z" />
      <path {...stroke} d="M17.5 9.5 15 12m0-2.5 2.5 2.5" />
    </svg>
  );
}

/** Four corner expand arrows. */
export function FullscreenIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden {...props}>
      <path
        {...stroke}
        d="M9 4.5H4.5V9M15 4.5h4.5V9M9 19.5H4.5V15M15 19.5h4.5V15"
      />
    </svg>
  );
}

export function FullscreenExitIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden {...props}>
      <path
        {...stroke}
        d="M9 4.5v4.5H4.5M15 4.5v4.5h4.5M9 19.5v-4.5H4.5M15 19.5v-4.5h4.5"
      />
    </svg>
  );
}

export function PipIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden {...props}>
      <rect {...stroke} x="3.5" y="5" width="17" height="14" rx="1.5" />
      <rect
        x="12"
        y="12"
        width="6.5"
        height="5"
        rx="0.75"
        fill="currentColor"
        stroke="none"
      />
    </svg>
  );
}

export function BrightnessIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden {...props}>
      <circle {...stroke} cx="12" cy="12" r="3.25" />
      <path {...stroke} d="M12 3.75v2M12 18.25v2M3.75 12h2M18.25 12h2" />
    </svg>
  );
}

export function MoreIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden {...props}>
      <circle cx="12" cy="6" r="1.35" fill="currentColor" />
      <circle cx="12" cy="12" r="1.35" fill="currentColor" />
      <circle cx="12" cy="18" r="1.35" fill="currentColor" />
    </svg>
  );
}

export function ShareIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden {...props}>
      <circle {...stroke} cx="18" cy="6" r="2" />
      <circle {...stroke} cx="6" cy="12" r="2" />
      <circle {...stroke} cx="18" cy="18" r="2" />
      <path {...stroke} d="M8 11l8-4M8 13l8 4" />
    </svg>
  );
}

/** Closed captions mark — frame + two short bars. */
export function CaptionsIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden {...props}>
      <rect {...stroke} x="3.25" y="5.5" width="17.5" height="13" rx="2" />
      <path {...stroke} strokeWidth={2} d="M7.25 12.5h3.25M13.5 12.5h3.25" />
    </svg>
  );
}

/** Google Cast / Chromecast sender mark. */
export function CastIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden {...props}>
      <path {...stroke} d="M3.5 6.5h17v11H14" />
      <path {...stroke} d="M3.5 15.25a3.25 3.25 0 0 1 3.25 3.25" />
      <path {...stroke} d="M3.5 12a6.5 6.5 0 0 1 6.5 6.5" />
      <circle cx="3.75" cy="19" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Filled Cast mark for active “Casting…” state. */
export function CastConnectedIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden {...props}>
      <path
        fill="currentColor"
        stroke="none"
        d="M3.5 5.25h17A1.75 1.75 0 0 1 22.25 7v9.5a1.75 1.75 0 0 1-1.75 1.75H14a.75.75 0 0 1 0-1.5h6.5a.25.25 0 0 0 .25-.25V7a.25.25 0 0 0-.25-.25h-17a.25.25 0 0 0-.25.25v2a.75.75 0 0 1-1.5 0V7A1.75 1.75 0 0 1 3.5 5.25z"
      />
      <path {...stroke} d="M3.5 15.25a3.25 3.25 0 0 1 3.25 3.25" />
      <path {...stroke} d="M3.5 12a6.5 6.5 0 0 1 6.5 6.5" />
      <circle cx="3.75" cy="19" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}
