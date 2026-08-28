#!/usr/bin/env python3
"""Rebuild branding/bonzai's macOS-native icon master, then regenerate the
full icon set with the Tauri CLI.

    python3 branding/bonzai/icons/_src/build-icon.py
    pnpm exec tauri icon /tmp/bonzai-icon-master.png -o /tmp/bonzai-icon-out
    cp /tmp/bonzai-icon-out/{32x32,128x128,128x128@2x,icon}.png \
       /tmp/bonzai-icon-out/icon.{icns,ico} branding/bonzai/icons/

`bonsai-mark-source.png` (this directory) is the raw favicon decoded from
iobonzai.com's favicon.svg (a 250x250 base64 PNG embedded in that SVG) — a
flat two-tone image, white bonsai-tree mark on a `#00000f` tile, full bleed,
no transparency of its own.

This script recovers the mark as white-on-transparent from that flat source,
then composites it onto a macOS Big-Sur-style squircle tile — matching the
visual language of src-tauri/icons/themed/_src/icon.template.svg (the app's
own canonical icon: a rounded-superellipse body with a soft shadow, a faint
top highlight, and an inset mark with its own drop shadow for lift) — so the
whitelabel Bonzai icon reads as a native macOS app icon instead of a flat
sharp-cornered square. See branding/README.md's icon section.

Pure Pillow — no SVG rasterizer is available in the dev sandbox this was
authored in, so the squircle is flattened from the exact cubic-bezier anchors
used by the canonical template (same path, so the corner radius matches the
rest of the app's icon family) and supersampled for antialiasing.
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

SRC_DIR = Path(__file__).resolve().parent
MARK_SOURCE = SRC_DIR / "bonsai-mark-source.png"
MASTER_OUT = Path("/tmp/bonzai-icon-master.png")

SS = 4  # supersample multiplier for the squircle mask rasterization (AA)

# Exact squircle anchor/control points from icon.template.svg's body path
# (1024x1024 viewBox), as (start, c1, c2, end) cubic-bezier segments.
SEGMENTS = [
    ((512, 100), (357.85, 100), (280.78, 100), (224.27, 121.49)),
    ((224.27, 121.49), (175.81, 139.85), (139.85, 175.81), (121.49, 224.27)),
    ((121.49, 224.27), (100, 280.78), (100, 357.85), (100, 512)),
    ((100, 512), (100, 666.15), (100, 743.22), (121.49, 799.73)),
    ((121.49, 799.73), (139.85, 848.19), (175.81, 884.15), (224.27, 902.51)),
    ((224.27, 902.51), (280.78, 924), (357.85, 924), (512, 924)),
    ((512, 924), (666.15, 924), (743.22, 924), (799.73, 902.51)),
    ((799.73, 902.51), (848.19, 884.15), (884.15, 848.19), (902.51, 799.73)),
    ((902.51, 799.73), (924, 743.22), (924, 666.15), (924, 512)),
    ((924, 512), (924, 357.85), (924, 280.78), (902.51, 224.27)),
    ((902.51, 224.27), (884.15, 175.81), (848.19, 139.85), (799.73, 121.49)),
    ((799.73, 121.49), (743.22, 100), (666.15, 100), (512, 100)),
]


def cubic_bezier(p0, p1, p2, p3, steps=64):
    points = []
    for i in range(steps):
        t = i / steps
        mt = 1 - t
        x = mt**3 * p0[0] + 3 * mt**2 * t * p1[0] + 3 * mt * t**2 * p2[0] + t**3 * p3[0]
        y = mt**3 * p0[1] + 3 * mt**2 * t * p1[1] + 3 * mt * t**2 * p2[1] + t**3 * p3[1]
        points.append((x, y))
    return points


def squircle_polygon(scale):
    points = []
    for p0, p1, p2, p3 in SEGMENTS:
        points.extend(cubic_bezier(p0, p1, p2, p3))
    return [(x * scale, y * scale) for x, y in points]


def make_squircle_mask(size):
    """Antialiased squircle alpha mask at `size`x`size`, viewBox 1024 scaled."""
    ss_size = size * SS
    scale = ss_size / 1024
    mask = Image.new("L", (ss_size, ss_size), 0)
    draw = ImageDraw.Draw(mask)
    draw.polygon(squircle_polygon(scale), fill=255)
    return mask.resize((size, size), Image.LANCZOS)


def vertical_gradient(size, top, bottom):
    grad = Image.new("RGB", (1, size))
    for y in range(size):
        t = y / max(size - 1, 1)
        r = round(top[0] + (bottom[0] - top[0]) * t)
        g = round(top[1] + (bottom[1] - top[1]) * t)
        b = round(top[2] + (bottom[2] - top[2]) * t)
        grad.putpixel((0, y), (r, g, b))
    return grad.resize((size, size))


def extract_mark(src_path):
    """Recover the mark as white-on-transparent from the flat two-tone
    source by using each pixel's own brightness as alpha (background
    ~luminance 5, mark 255), then trim to its content bounding box."""
    im = Image.open(src_path).convert("RGBA")
    luminance = im.convert("L")
    alpha = luminance.point(lambda v: max(0, min(255, round((v - 15) / (255 - 15) * 255))))
    white = Image.new("RGBA", im.size, (255, 255, 255, 255))
    white.putalpha(alpha)
    return white.crop(white.getbbox())


def drop_shadow(alpha_layer, size, offset, blur, opacity):
    """A soft black shadow shaped like `alpha_layer`, offset down and blurred."""
    shadow = Image.new("RGBA", size, (0, 0, 0, 0))
    shadow.paste((0, 0, 0, opacity), offset, alpha_layer)
    return shadow.filter(ImageFilter.GaussianBlur(blur))


def build(master_size, out_path):
    # 1. Squircle body with a subtle gradient (near-black, faint depth) and a
    # soft drop shadow beneath the tile itself — the same "bodyShadow" beat
    # the canonical template uses.
    squircle_mask = make_squircle_mask(master_size)
    bg = vertical_gradient(master_size, (13, 13, 26), (0, 0, 8))
    tile = Image.new("RGBA", (master_size, master_size), (0, 0, 0, 0))
    tile.paste(bg, (0, 0), squircle_mask)

    canvas = Image.new("RGBA", (master_size, master_size), (0, 0, 0, 0))
    body_shadow = drop_shadow(
        squircle_mask, (master_size, master_size), (0, round(master_size * 0.02)),
        blur=master_size * 0.02, opacity=110,
    )
    canvas.alpha_composite(body_shadow)
    canvas.alpha_composite(tile)

    # 2. A faint top highlight for glassy depth, clipped to the squircle.
    highlight = Image.new("RGBA", (master_size, master_size), (0, 0, 0, 0))
    hdraw = ImageDraw.Draw(highlight)
    hdraw.ellipse(
        [master_size * 0.08, -master_size * 0.35, master_size * 0.92, master_size * 0.55],
        fill=(120, 130, 255, 40),
    )
    highlight = highlight.filter(ImageFilter.GaussianBlur(master_size * 0.06))
    highlight.putalpha(
        Image.composite(highlight.split()[3], Image.new("L", (master_size, master_size), 0), squircle_mask)
    )
    canvas.alpha_composite(highlight)

    # 3. Inset foreground mark (the bonsai tree), with its own soft shadow —
    # the same generous ~56%-of-canvas inset the canonical Clovy mark uses.
    mark = extract_mark(MARK_SOURCE)
    mark_w, mark_h = mark.size
    target_w = round(master_size * 0.56)
    target_h = round(target_w * mark_h / mark_w)
    mark = mark.resize((target_w, target_h), Image.LANCZOS)
    mx = (master_size - target_w) // 2
    my = (master_size - target_h) // 2 - round(master_size * 0.006)

    mark_layer = Image.new("RGBA", (master_size, master_size), (0, 0, 0, 0))
    mark_layer.paste(mark, (mx, my), mark)
    mark_shadow = drop_shadow(
        mark, (master_size, master_size), (mx, my + round(master_size * 0.012)),
        blur=master_size * 0.018, opacity=140,
    )
    canvas.alpha_composite(mark_shadow)
    canvas.alpha_composite(mark_layer)

    canvas.save(out_path)
    print(f"Wrote {out_path} ({master_size}x{master_size})")


if __name__ == "__main__":
    build(1024, MASTER_OUT)
