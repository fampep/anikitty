"use client";

import {
  formatStreamQualityLabel,
  type KittyStreamQuality,
} from "@/lib/kitty/stream-quality";
import { MenuItem, MenuSection } from "../chrome";
import type { HlsLevelOption } from "../types";

type Props = {
  dense?: boolean;
  activeSrc?: string;
  serverQualities: KittyStreamQuality[];
  showHlsQualityMenu: boolean;
  hlsLevels: HlsLevelOption[];
  hlsLevelIndex: number;
  onSelectServer: (entry: KittyStreamQuality) => void;
  onSelectHls: (index: number) => void;
};

export function QualityMenuContent({
  dense,
  activeSrc,
  serverQualities,
  showHlsQualityMenu,
  hlsLevels,
  hlsLevelIndex,
  onSelectServer,
  onSelectHls,
}: Props) {
  if (!serverQualities.length && !showHlsQualityMenu) {
    return (
      <p className="px-3 py-4 text-center text-[11px] text-white/40">
        No alternate qualities for this stream
      </p>
    );
  }

  return (
    <>
      {serverQualities.length > 1 ? (
        <MenuSection title="Source" dense={dense}>
          {serverQualities.map((entry) => (
            <MenuItem
              key={entry.file}
              dense={dense}
              active={activeSrc === entry.file}
              onClick={() => onSelectServer(entry)}
            >
              {formatStreamQualityLabel(entry.quality)}
            </MenuItem>
          ))}
        </MenuSection>
      ) : null}
      {showHlsQualityMenu ? (
        <MenuSection title="Quality" dense={dense}>
          <MenuItem
            dense={dense}
            active={hlsLevelIndex < 0}
            onClick={() => onSelectHls(-1)}
          >
            Auto · Adaptive
          </MenuItem>
          {[...hlsLevels]
            .sort((a, b) => (b.height ?? 0) - (a.height ?? 0))
            .map((level) => (
              <MenuItem
                key={level.index}
                dense={dense}
                active={hlsLevelIndex === level.index}
                onClick={() => onSelectHls(level.index)}
              >
                {level.label}
              </MenuItem>
            ))}
        </MenuSection>
      ) : null}
    </>
  );
}
