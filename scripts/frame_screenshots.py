#!/usr/bin/env python3
# Copyright 2026 fampep
# Licensed under the Apache License, Version 2.0. See the LICENSE file.

"""Frame raw screenshots with Google's Pixel 8 device art.

Raw captures live in docs/screenshots/raw/. This writes transparent framed
PNGs next to that folder. The README shows home and the title page. The
bezel, mask, and layout are downloaded when this runs. They are not
committed. Android Studio's device art is not for Play Store listings.
"""

from __future__ import annotations

import re
import sys
import urllib.request
from pathlib import Path

from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "docs" / "screenshots" / "raw"
OUT = ROOT / "docs" / "screenshots"
CACHE = Path.home() / ".cache" / "anikitty-device-art" / "pixel_8"

ART_BASE = (
    "https://raw.githubusercontent.com/JetBrains/android/master/"
    "artwork/resources/device-art-resources/pixel_8"
)
ART_FILES = ("back.webp", "mask.webp", "layout")

def fetch_art() -> None:
    CACHE.mkdir(parents=True, exist_ok=True)
    for name in ART_FILES:
        dest = CACHE / name
        if dest.exists() and dest.stat().st_size > 0:
            continue
        url = f"{ART_BASE}/{name}"
        print(f"download {url}")
        urllib.request.urlretrieve(url, dest)


def parse_layout(text: str) -> tuple[int, int, int, int, int, int]:
    """Return frame width, height, screen x, y, screen width, screen height."""
    frame_w = int(re.search(r"layouts\s*\{\s*portrait\s*\{\s*width\s+(\d+)", text).group(1))
    frame_h = int(re.search(r"layouts\s*\{\s*portrait\s*\{\s*width\s+\d+\s*height\s+(\d+)", text).group(1))
    screen_w = int(re.search(r"display\s*\{\s*width\s+(\d+)", text).group(1))
    screen_h = int(re.search(r"display\s*\{\s*width\s+\d+\s*height\s+(\d+)", text).group(1))
    # The device part is the screen inset inside the frame.
    device = re.search(r'name\s+device\s+x\s+(\d+)\s+y\s+(\d+)', text)
    if device is None:
        raise SystemExit("pixel 8 layout has no device inset")
    return frame_w, frame_h, int(device.group(1)), int(device.group(2)), screen_w, screen_h


def frame_screen(shot: Image.Image, art: dict) -> Image.Image:
    frame_w, frame_h, sx, sy, screen_w, screen_h = art["box"]
    back: Image.Image = art["back"]
    mask: Image.Image = art["mask"]
    screen = shot.convert("RGBA").resize((screen_w, screen_h), Image.Resampling.LANCZOS)
    phone = Image.new("RGBA", (frame_w, frame_h), (0, 0, 0, 0))
    phone.alpha_composite(back, (0, 0))
    phone.paste(screen, (sx, sy), screen)
    # Mask is the screen-sized foreground: rounded corners and the camera hole.
    mask_layer = Image.new("RGBA", phone.size, (0, 0, 0, 0))
    mask_layer.paste(mask, (sx, sy), mask)
    phone.alpha_composite(mask_layer)
    return with_shadow(phone)


def with_shadow(phone: Image.Image) -> Image.Image:
    pad = 90
    silhouette = Image.new("RGBA", phone.size, (0, 0, 0, 0))
    black = Image.new("RGBA", phone.size, (0, 0, 0, 255))
    alpha = phone.getchannel("A").point(lambda a: int(a * 0.55))
    black.putalpha(alpha)
    silhouette.alpha_composite(black)
    blurred = silhouette.filter(ImageFilter.GaussianBlur(26))
    canvas = Image.new("RGBA", (phone.width + pad * 2, phone.height + pad * 2), (0, 0, 0, 0))
    canvas.alpha_composite(blurred, (pad, pad + 28))
    canvas.alpha_composite(phone, (pad, pad))
    return canvas


def main() -> int:
    if not RAW.is_dir():
        print(f"missing {RAW}", file=sys.stderr)
        return 1
    shots = sorted(RAW.glob("*.png"))
    if not shots:
        print(f"no png files in {RAW}", file=sys.stderr)
        return 1
    fetch_art()
    box = parse_layout((CACHE / "layout").read_text())
    art = {
        "box": box,
        "back": Image.open(CACHE / "back.webp").convert("RGBA"),
        "mask": Image.open(CACHE / "mask.webp").convert("RGBA"),
    }
    for path in shots:
        phone = frame_screen(Image.open(path), art)
        dest = OUT / path.name
        phone.save(dest, "PNG", optimize=True)
        print(f"framed {dest.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
