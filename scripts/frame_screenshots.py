#!/usr/bin/env python3
# Copyright 2026 fampep
# Licensed under the Apache License, Version 2.0. See the LICENSE file.

"""Frame raw screenshots with Google's Pixel 8 device art.

The README uses one unframed capture, docs/screenshots/app.png. This script
is only for an optional device-art pass. Drop PNGs in docs/screenshots/raw/
first. The bezel, mask, and layout are downloaded when this runs. They are
not committed. Android Studio's device art is not for Play Store listings.
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

# App page black.
PAGE = (5, 5, 6, 255)
HERO_SHOT = "home"
HERO_W, HERO_H = 1600, 1280


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


def solve(a: list[list[float]], b: list[float]) -> list[float]:
    n = len(b)
    m = [row[:] + [b[i]] for i, row in enumerate(a)]
    for col in range(n):
        pivot = max(range(col, n), key=lambda r: abs(m[r][col]))
        m[col], m[pivot] = m[pivot], m[col]
        div = m[col][col]
        if abs(div) < 1e-12:
            raise SystemExit("perspective solve failed")
        for j in range(col, n + 1):
            m[col][j] /= div
        for r in range(n):
            if r == col:
                continue
            factor = m[r][col]
            for j in range(col, n + 1):
                m[r][j] -= factor * m[col][j]
    return [m[i][n] for i in range(n)]


def perspective(image: Image.Image) -> Image.Image:
    """A slight lean back and turn, the way a product shot sits on a desk."""
    w, h = image.size
    # Source rectangle, then a trapezoid that is narrower at the top and shifted.
    src = [(0, 0), (w, 0), (w, h), (0, h)]
    inset = w * 0.045
    lean = w * 0.03
    dst = [
        (inset + lean, h * 0.02),
        (w - inset + lean, 0),
        (w - w * 0.01, h),
        (w * 0.015, h * 0.985),
    ]
    # Map output pixels back to the source.
    matrix = []
    flat = []
    for (sx, sy), (dx, dy) in zip(src, dst):
        matrix.append([dx, dy, 1, 0, 0, 0, -sx * dx, -sx * dy])
        matrix.append([0, 0, 0, dx, dy, 1, -sy * dx, -sy * dy])
        flat.extend([sx, sy])
    coeffs = solve(matrix, flat)
    warped = image.transform((w, h), Image.Transform.PERSPECTIVE, coeffs, Image.Resampling.BICUBIC)
    turned = warped.rotate(-7, resample=Image.Resampling.BICUBIC, expand=True)
    return turned


def build_hero(phone: Image.Image) -> Image.Image:
    hero = Image.new("RGBA", (HERO_W, HERO_H), PAGE)
    shown = perspective(phone)
    scale = min((HERO_W * 0.62) / shown.width, (HERO_H * 0.92) / shown.height)
    sized = shown.resize(
        (max(1, round(shown.width * scale)), max(1, round(shown.height * scale))),
        Image.Resampling.LANCZOS,
    )
    x = (HERO_W - sized.width) // 2
    y = (HERO_H - sized.height) // 2 + 10
    hero.alpha_composite(sized, (x, y))
    return hero


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
    framed: dict[str, Image.Image] = {}
    for path in shots:
        phone = frame_screen(Image.open(path), art)
        dest = OUT / path.name
        phone.save(dest, "PNG", optimize=True)
        framed[path.stem] = phone
        print(f"framed {dest.relative_to(ROOT)}")
    hero_name = HERO_SHOT if HERO_SHOT in framed else next(iter(framed))
    hero = build_hero(framed[hero_name])
    hero_path = OUT / "hero.png"
    hero.save(hero_path, "PNG", optimize=True)
    print(f"hero {hero_path.relative_to(ROOT)} from {hero_name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
