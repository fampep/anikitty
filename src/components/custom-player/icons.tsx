import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/** Filled triangle for the bottom control strip. */
export function PlayIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden {...props}>
      <path d="M8 5.25v13.5L19.5 12 8 5.25z" fill="currentColor" />
    </svg>
  );
}

/** Outline triangle for the large center overlay button. */
export function PlayOutlineIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden {...props}>
      <path {...stroke} strokeWidth={1.6} d="M9 6.8v10.4L18.2 12 9 6.8z" />
    </svg>
  );
}

export function PauseIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden {...props}>
      <path {...stroke} strokeWidth={2} d="M8 6v12M16 6v12" />
    </svg>
  );
}

export function Rewind10Icon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden {...props}>
      <path {...stroke} d="M7.2 9.2A6.75 6.75 0 1 0 8.1 17.4" />
      <path {...stroke} d="M7 6.5v3.2h3.2" />
      <text
        x="12"
        y="14.1"
        fill="currentColor"
        stroke="none"
        fontSize="6.25"
        fontWeight="500"
        textAnchor="middle"
        fontFamily="system-ui, -apple-system, sans-serif"
      >
        10
      </text>
    </svg>
  );
}

export function Forward10Icon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden {...props}>
      <path {...stroke} d="M16.8 9.2A6.75 6.75 0 1 1 15.9 17.4" />
      <path {...stroke} d="M17 6.5v3.2h-3.2" />
      <text
        x="12"
        y="14.1"
        fill="currentColor"
        stroke="none"
        fontSize="6.25"
        fontWeight="500"
        textAnchor="middle"
        fontFamily="system-ui, -apple-system, sans-serif"
      >
        10
      </text>
    </svg>
  );
}

export function VolumeIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden {...props}>
      <path {...stroke} d="M4.5 9.5v5h3.2L12 18V6L7.7 9.5H4.5z" />
      <path {...stroke} d="M15.2 9.3a3.4 3.4 0 0 1 0 5.4" />
      <path {...stroke} d="M17.4 7a6 6 0 0 1 0 10" />
    </svg>
  );
}

export function VolumeMuteIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden {...props}>
      <path {...stroke} d="M4.5 9.5v5h3.2L12 18V6L7.7 9.5H4.5z" />
      <path {...stroke} d="M17.5 9.5 14 13m0-3.5 3.5 3.5" />
    </svg>
  );
}

/** Four corner expand arrows. */
export function FullscreenIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden {...props}>
      <path {...stroke} d="M9 4.5H4.5V9M15 4.5h4.5V9M9 19.5H4.5V15M15 19.5h4.5V15" />
    </svg>
  );
}

export function FullscreenExitIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden {...props}>
      <path {...stroke} d="M9 4.5v4.5H4.5M15 4.5v4.5h4.5M9 19.5v-4.5H4.5M15 19.5v-4.5h4.5" />
    </svg>
  );
}

export function PipIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden {...props}>
      <rect {...stroke} x="3.5" y="5" width="17" height="14" rx="2.5" />
      <rect
        x="12"
        y="11.5"
        width="6.5"
        height="5"
        rx="1"
        fill="currentColor"
        stroke="none"
      />
    </svg>
  );
}

export function BrightnessIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden {...props}>
      <circle {...stroke} cx="12" cy="12" r="3" />
      <path
        {...stroke}
        d="M12 3.25v2.1M12 18.65v2.1M3.25 12h2.1M18.65 12h2.1M6.05 6.05l1.5 1.5M16.45 16.45l1.5 1.5M6.05 17.95l1.5-1.5M16.45 7.55l1.5-1.5"
      />
    </svg>
  );
}

export function MoreIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden {...props}>
      <circle cx="12" cy="5.5" r="1.15" fill="currentColor" />
      <circle cx="12" cy="12" r="1.15" fill="currentColor" />
      <circle cx="12" cy="18.5" r="1.15" fill="currentColor" />
    </svg>
  );
}

export function ShareIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden {...props}>
      <circle {...stroke} cx="18" cy="5.5" r="2.1" />
      <circle {...stroke} cx="6" cy="12" r="2.1" />
      <circle {...stroke} cx="18" cy="18.5" r="2.1" />
      <path {...stroke} d="M8 10.85 15.95 6.75M8 13.15l7.95 4.1" />
    </svg>
  );
}

/** Thin-stroke closed captions mark (ArtPlayer-like). */
export function CaptionsIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden {...props}>
      <rect {...stroke} x="3.25" y="5.5" width="17.5" height="13" rx="2.25" />
      <text
        x="12"
        y="14.35"
        fill="currentColor"
        stroke="none"
        fontSize="7.25"
        fontWeight="600"
        textAnchor="middle"
        fontFamily="system-ui, -apple-system, sans-serif"
      >
        CC
      </text>
    </svg>
  );
}
