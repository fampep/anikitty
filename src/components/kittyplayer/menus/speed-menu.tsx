"use client";

import { MenuItem, MenuSection } from "../chrome";
import { KITTY_PLAYER_SPEEDS } from "../prefs";

type Props = {
  playbackRate: number;
  dense?: boolean;
  onSelect: (rate: number) => void;
  /** When false, omit the section title (submenu already has a header). */
  showTitle?: boolean;
};

export function SpeedMenuContent({
  playbackRate,
  dense,
  onSelect,
  showTitle = true,
}: Props) {
  const items = KITTY_PLAYER_SPEEDS.map((rate) => (
    <MenuItem
      key={rate}
      dense={dense}
      active={playbackRate === rate}
      onClick={() => onSelect(rate)}
    >
      {rate === 1 ? "Normal" : `${rate}×`}
    </MenuItem>
  ));

  if (!showTitle) return <>{items}</>;

  return (
    <MenuSection title="Speed" dense={dense}>
      {items}
    </MenuSection>
  );
}
