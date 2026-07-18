import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.85,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/** Filled triangle for the bottom control strip. */
export function PlayIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden {...props}>
      <path d="M8.2 5.4v13.2L19.4 12 8.2 5.4z" fill="currentColor" />
    </svg>
  );
}

/** Outline triangle for the large center overlay button. */
export function PlayOutlineIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden {...props}>
      <path {...stroke} d="M9.1 6.6v10.8L18.5 12 9.1 6.6z" />
    </svg>
  );
}

export function PauseIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden {...props}>
      <path {...stroke} strokeWidth={2} d="M8.25 6.25v11.5M15.75 6.25v11.5" />
    </svg>
  );
}

/** Shared filled “10” for skip glyphs — reads clearly at ~18–24px. */
function SkipTenMark() {
  return (
    <path
      fill="currentColor"
      fillRule="evenodd"
      stroke="none"
      d="M9.15 10.05h1.2v5.7H9.15zm2.55 0h3.05c1.45 0 2.4 1 2.4 2.85s-.95 2.85-2.4 2.85h-3.05zm1.2 1.15v3.4h1.8c.75 0 1.2-.55 1.2-1.7s-.45-1.7-1.2-1.7z"
    />
  );
}

/** Skip back 10s — circular arrow + bold “10”. */
export function Rewind10Icon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden {...props}>
      <path {...stroke} d="M7.85 7.4a7.1 7.1 0 1 0 1.35 9.35" />
      <path {...stroke} d="M8.1 4.2 5.15 7.4 8.1 10.55" />
      <SkipTenMark />
    </svg>
  );
}

/** Skip forward 10s — circular arrow + bold “10”. */
export function Forward10Icon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden {...props}>
      <path {...stroke} d="M16.15 7.4a7.1 7.1 0 1 1-1.35 9.35" />
      <path {...stroke} d="M15.9 4.2 18.85 7.4 15.9 10.55" />
      <SkipTenMark />
    </svg>
  );
}

export function VolumeIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden {...props}>
      <path {...stroke} d="M4.75 9.4v5.2h3.15L12.2 18.5V5.5L7.9 9.4H4.75z" />
      <path {...stroke} d="M15.35 9.15a3.55 3.55 0 0 1 0 5.7" />
      <path {...stroke} d="M17.65 6.85a6.2 6.2 0 0 1 0 10.3" />
    </svg>
  );
}

export function VolumeLowIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden {...props}>
      <path {...stroke} d="M4.75 9.4v5.2h3.15L12.2 18.5V5.5L7.9 9.4H4.75z" />
      <path {...stroke} d="M15.35 9.15a3.55 3.55 0 0 1 0 5.7" />
    </svg>
  );
}

export function VolumeMuteIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden {...props}>
      <path {...stroke} d="M4.75 9.4v5.2h3.15L12.2 18.5V5.5L7.9 9.4H4.75z" />
      <path {...stroke} d="M17.6 9.4 14.15 12.85m0-3.45L17.6 12.85" />
    </svg>
  );
}

/** Four corner expand arrows. */
export function FullscreenIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden {...props}>
      <path
        {...stroke}
        d="M8.75 4.5H4.5V8.75M15.25 4.5H19.5V8.75M8.75 19.5H4.5V15.25M15.25 19.5H19.5V15.25"
      />
    </svg>
  );
}

export function FullscreenExitIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden {...props}>
      <path
        {...stroke}
        d="M8.75 4.5v4.25H4.5M15.25 4.5v4.25H19.5M8.75 19.5v-4.25H4.5M15.25 19.5v-4.25H19.5"
      />
    </svg>
  );
}

export function PipIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden {...props}>
      <rect {...stroke} x="3.25" y="4.75" width="17.5" height="14.5" rx="2.25" />
      <rect
        x="11.75"
        y="11.25"
        width="7"
        height="5.5"
        rx="1.1"
        fill="currentColor"
        stroke="none"
      />
    </svg>
  );
}

export function BrightnessIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden {...props}>
      <circle {...stroke} cx="12" cy="12" r="3.15" />
      <path
        {...stroke}
        d="M12 3.15v2.2M12 18.65v2.2M3.15 12h2.2M18.65 12h2.2M5.9 5.9l1.55 1.55M16.55 16.55l1.55 1.55M5.9 18.1l1.55-1.55M16.55 7.45l1.55-1.55"
      />
    </svg>
  );
}

export function MoreIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden {...props}>
      <circle cx="12" cy="5.35" r="1.25" fill="currentColor" />
      <circle cx="12" cy="12" r="1.25" fill="currentColor" />
      <circle cx="12" cy="18.65" r="1.25" fill="currentColor" />
    </svg>
  );
}

export function ShareIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden {...props}>
      <circle {...stroke} cx="18" cy="5.4" r="2.2" />
      <circle {...stroke} cx="6" cy="12" r="2.2" />
      <circle {...stroke} cx="18" cy="18.6" r="2.2" />
      <path {...stroke} d="M8.1 10.75 15.85 6.7M8.1 13.25l7.75 4.05" />
    </svg>
  );
}

/** Closed captions mark. */
export function CaptionsIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden {...props}>
      <rect {...stroke} x="3" y="5.25" width="18" height="13.5" rx="2.25" />
      <path
        fill="currentColor"
        stroke="none"
        d="M7.15 10.2h1.2c.95 0 1.55.55 1.55 1.4 0 .85-.6 1.4-1.55 1.4h-.55v.85h1.85v1.05H7.15zm1.15 1.05v1.7h.4c.35 0 .55-.2.55-.5s-.2-.5-.55-.5h-.4zm4.35-1.05h1.2c.95 0 1.55.55 1.55 1.4 0 .85-.6 1.4-1.55 1.4h-.55v.85h1.85v1.05h-3.15zm1.15 1.05v1.7h.4c.35 0 .55-.2.55-.5s-.2-.5-.55-.5h-.4z"
      />
    </svg>
  );
}

/** Google Cast / Chromecast sender mark. */
export function CastIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden {...props}>
      <path
        {...stroke}
        d="M3.35 6h17.3A1.35 1.35 0 0 1 22 7.35v9.3A1.35 1.35 0 0 1 20.65 18H14.1"
      />
      <path {...stroke} d="M3.35 15.1a3.4 3.4 0 0 1 3.4 3.4" />
      <path {...stroke} d="M3.35 11.85a6.65 6.65 0 0 1 6.65 6.65" />
      <path {...stroke} d="M3.35 8.6a9.9 9.9 0 0 1 9.9 9.9" />
      <circle cx="3.7" cy="19.15" r="1.05" fill="currentColor" stroke="none" />
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
        d="M3.35 5.35h17.3A1.9 1.9 0 0 1 22.55 7.25v9.5a1.9 1.9 0 0 1-1.9 1.9H13.75a.8.8 0 0 1 0-1.6h6.9a.3.3 0 0 0 .3-.3v-9.5a.3.3 0 0 0-.3-.3H3.35a.3.3 0 0 0-.3.3v2.35a.8.8 0 1 1-1.6 0V7.25a1.9 1.9 0 0 1 1.9-1.9z"
      />
      <path {...stroke} d="M3.35 15.1a3.4 3.4 0 0 1 3.4 3.4" />
      <path {...stroke} d="M3.35 11.85a6.65 6.65 0 0 1 6.65 6.65" />
      <circle cx="3.7" cy="19.15" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}
