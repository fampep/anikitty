import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

/** Shared stroke — slightly heavier for clearer controls on phone screens. */
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
      <path d="M8.2 5.8v12.4L18.8 12 8.2 5.8z" fill="currentColor" />
    </svg>
  );
}

/** Outline triangle for the large center overlay button — optically centered. */
export function PlayOutlineIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden {...props}>
      <path {...stroke} d="M9.6 7.35v9.3L17.4 12 9.6 7.35z" />
    </svg>
  );
}

export function PauseIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden {...props}>
      <path {...stroke} d="M9 6.75v10.5M15 6.75v10.5" />
    </svg>
  );
}

/** Double chevron seek back. */
export function SeekBackIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden {...props}>
      <path {...stroke} d="M11.25 7.5 6.5 12l4.75 4.5" />
      <path {...stroke} d="M17.5 7.5 12.75 12l4.75 4.5" />
    </svg>
  );
}

/** Double chevron seek forward. */
export function SeekForwardIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden {...props}>
      <path {...stroke} d="M12.75 7.5 17.5 12l-4.75 4.5" />
      <path {...stroke} d="M6.5 7.5 11.25 12 6.5 16.5" />
    </svg>
  );
}

/** Skip to previous episode (bar + triangle). */
export function EpisodePrevIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden {...props}>
      <path {...stroke} d="M7 7v10" />
      <path {...stroke} d="M17.5 7.25 9.5 12l8 4.75" />
    </svg>
  );
}

/** Skip to next episode (triangle + bar). */
export function EpisodeNextIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden {...props}>
      <path {...stroke} d="M17 7v10" />
      <path {...stroke} d="M6.5 7.25 14.5 12l-8 4.75" />
    </svg>
  );
}

export function VolumeIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden {...props}>
      <path {...stroke} d="M5.5 9.75v4.5h3.1L13.5 18.5V5.5L8.6 9.75H5.5z" />
      <path {...stroke} d="M16.25 9.6a3 3 0 0 1 0 4.8" />
      <path {...stroke} d="M18.6 7.4a6 6 0 0 1 0 9.2" />
    </svg>
  );
}

export function VolumeLowIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden {...props}>
      <path {...stroke} d="M5.5 9.75v4.5h3.1L13.5 18.5V5.5L8.6 9.75H5.5z" />
      <path {...stroke} d="M16.25 9.6a3 3 0 0 1 0 4.8" />
    </svg>
  );
}

export function VolumeMuteIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden {...props}>
      <path {...stroke} d="M5.5 9.75v4.5h3.1L13.5 18.5V5.5L8.6 9.75H5.5z" />
      <path {...stroke} d="M17.25 9.75 15 12m0-2.25 2.25 2.25" />
    </svg>
  );
}

/** Four corner expand arrows. */
export function FullscreenIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden {...props}>
      <path
        {...stroke}
        d="M9 4.75H4.75V9M15 4.75h4.25V9M9 19.25H4.75V15M15 19.25h4.25V15"
      />
    </svg>
  );
}

export function FullscreenExitIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden {...props}>
      <path
        {...stroke}
        d="M9 4.75v4.25H4.75M15 4.75v4.25h4.25M9 19.25v-4.25H4.75M15 19.25v-4.25h4.25"
      />
    </svg>
  );
}

export function PipIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden {...props}>
      <rect {...stroke} x="3.75" y="5.25" width="16.5" height="13.5" rx="1.75" />
      <rect
        x="12.25"
        y="12.25"
        width="6"
        height="4.5"
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
      <path {...stroke} d="M12 3.75v1.75M12 18.5v1.75M3.75 12h1.75M18.5 12h1.75" />
      <path {...stroke} d="m6.1 6.1 1.25 1.25M16.65 16.65l1.25 1.25M6.1 17.9l1.25-1.25M16.65 7.35l1.25-1.25" />
    </svg>
  );
}

export function MoreIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden {...props}>
      <circle cx="12" cy="6.25" r="1.25" fill="currentColor" />
      <circle cx="12" cy="12" r="1.25" fill="currentColor" />
      <circle cx="12" cy="17.75" r="1.25" fill="currentColor" />
    </svg>
  );
}

/** Gear / settings for the player options menu. */
export function SettingsIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden {...props}>
      <circle {...stroke} cx="12" cy="12" r="3" />
      <path
        {...stroke}
        d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"
      />
    </svg>
  );
}

export function ShareIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden {...props}>
      <circle {...stroke} cx="18" cy="5.75" r="2" />
      <circle {...stroke} cx="6" cy="12" r="2" />
      <circle {...stroke} cx="18" cy="18.25" r="2" />
      <path {...stroke} d="m8.1 11 7.7-3.9M8.1 13l7.7 3.9" />
    </svg>
  );
}

/** Closed captions — frame + CC bars. */
export function CaptionsIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden {...props}>
      <rect {...stroke} x="3.25" y="5.5" width="17.5" height="13" rx="2.25" />
      <path {...stroke} d="M7.25 12.25h2.75M8.6 10.35v3.8" />
      <path {...stroke} d="M13.5 12.25h3.25M15.1 10.35v3.8" />
    </svg>
  );
}

/** Google Cast / Chromecast sender mark. */
export function CastIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden {...props}>
      <path {...stroke} d="M3.75 6.5h16.5v11H14.25" />
      <path {...stroke} d="M3.75 15.1a3.15 3.15 0 0 1 3.15 3.15" />
      <path {...stroke} d="M3.75 12a6.25 6.25 0 0 1 6.25 6.25" />
      <circle cx="3.9" cy="18.9" r="0.95" fill="currentColor" stroke="none" />
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
        d="M3.75 5.35h16.5A1.65 1.65 0 0 1 21.9 7v9.5a1.65 1.65 0 0 1-1.65 1.65H14.25a.75.75 0 0 1 0-1.5h5.85a.15.15 0 0 0 .15-.15V7a.15.15 0 0 0-.15-.15H3.75A.15.15 0 0 0 3.6 7v2.1a.75.75 0 0 1-1.5 0V7a1.65 1.65 0 0 1 1.65-1.65z"
      />
      <path {...stroke} d="M3.75 15.1a3.15 3.15 0 0 1 3.15 3.15" />
      <path {...stroke} d="M3.75 12a6.25 6.25 0 0 1 6.25 6.25" />
      <circle cx="3.9" cy="18.9" r="0.95" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Apple AirPlay mark — screen + uplink triangle. */
export function AirPlayIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden {...props}>
      <path
        {...stroke}
        d="M5.25 4.75h13.5A1.25 1.25 0 0 1 20 6v8.25A1.25 1.25 0 0 1 18.75 15.5h-2.5"
      />
      <path
        fill="currentColor"
        stroke="none"
        d="M12 13.75 7.35 20.1h9.3L12 13.75z"
      />
    </svg>
  );
}

/** Filled AirPlay mark for active wireless routing. */
export function AirPlayConnectedIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden {...props}>
      <path
        fill="currentColor"
        stroke="none"
        d="M5.25 3.6h13.5A1.9 1.9 0 0 1 20.65 5.5v8.25a1.9 1.9 0 0 1-1.9 1.9h-2.15a.75.75 0 0 1 0-1.5h2.15a.4.4 0 0 0 .4-.4V5.5a.4.4 0 0 0-.4-.4H5.25a.4.4 0 0 0-.4.4v8.25a.4.4 0 0 0 .4.4h2.15a.75.75 0 0 1 0 1.5H5.25a1.9 1.9 0 0 1-1.9-1.9V5.5a1.9 1.9 0 0 1 1.9-1.9z"
      />
      <path
        fill="currentColor"
        stroke="none"
        d="M12 13.75 7.35 20.1h9.3L12 13.75z"
      />
    </svg>
  );
}
