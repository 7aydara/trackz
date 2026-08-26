"""
Genere les icones PWA de Trackz sans dependance externe.

Dessin : carre arrondi violet (l'accent du tracker) + coche blanche,
rendu en 4x puis reduit pour lisser les bords.
"""

import struct
import zlib
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "public" / "icons"
SS = 4  # supersampling

ACCENT = (124, 58, 237)      # #7c3aed
ACCENT_DARK = (91, 33, 182)  # degrade vers le bas
WHITE = (255, 255, 255)


def rounded_rect_mask(size, radius):
    """Masque booleen d'un carre a coins arrondis."""
    mask = bytearray(size * size)
    r2 = radius * radius
    for y in range(size):
        for x in range(size):
            cx = x
            cy = y
            if x < radius and y < radius:
                cx, cy = radius, radius
            elif x >= size - radius and y < radius:
                cx, cy = size - radius - 1, radius
            elif x < radius and y >= size - radius:
                cx, cy = radius, size - radius - 1
            elif x >= size - radius and y >= size - radius:
                cx, cy = size - radius - 1, size - radius - 1
            else:
                mask[y * size + x] = 1
                continue
            dx, dy = x - cx, y - cy
            mask[y * size + x] = 1 if dx * dx + dy * dy <= r2 else 0
    return mask


def stroke_segment(pixels, size, x0, y0, x1, y1, width):
    """Trace un segment epais (distance point-segment)."""
    half = width / 2
    minx = max(0, int(min(x0, x1) - width))
    maxx = min(size - 1, int(max(x0, x1) + width))
    miny = max(0, int(min(y0, y1) - width))
    maxy = min(size - 1, int(max(y0, y1) + width))
    dx, dy = x1 - x0, y1 - y0
    length2 = dx * dx + dy * dy or 1

    for y in range(miny, maxy + 1):
        for x in range(minx, maxx + 1):
            t = ((x - x0) * dx + (y - y0) * dy) / length2
            t = max(0.0, min(1.0, t))
            px, py = x0 + t * dx, y0 + t * dy
            if (x - px) ** 2 + (y - py) ** 2 <= half * half:
                pixels[y * size + x] = WHITE


def render(size, *, maskable=False):
    big = size * SS
    radius = 0 if maskable else int(big * 0.22)
    mask = rounded_rect_mask(big, radius) if radius else bytearray([1] * big * big)

    pixels = [None] * (big * big)
    for y in range(big):
        # degrade vertical discret
        t = y / (big - 1)
        base = tuple(
            round(ACCENT[i] + (ACCENT_DARK[i] - ACCENT[i]) * t) for i in range(3)
        )
        for x in range(big):
            pixels[y * big + x] = base if mask[y * big + x] else None

    # coche, resserree pour une icone maskable (zone de securite 80%)
    scale = 0.62 if maskable else 0.78
    off = (1 - scale) / 2
    def p(fx, fy):
        return (off + fx * scale) * big, (off + fy * scale) * big

    width = big * (0.085 if maskable else 0.105)
    a = p(0.16, 0.53)
    b = p(0.40, 0.76)
    c = p(0.84, 0.26)
    stroke_segment(pixels, big, a[0], a[1], b[0], b[1], width)
    stroke_segment(pixels, big, b[0], b[1], c[0], c[1], width)

    # reduction par moyenne (anti-aliasing + alpha sur les coins)
    out = bytearray()
    for y in range(size):
        out.append(0)  # filtre PNG "none"
        for x in range(size):
            r = g = bl = al = 0
            for sy in range(SS):
                for sx in range(SS):
                    px = pixels[(y * SS + sy) * big + (x * SS + sx)]
                    if px is not None:
                        r += px[0]
                        g += px[1]
                        bl += px[2]
                        al += 255
            n = SS * SS
            count = al // 255 or 1
            out += bytes((r // count, g // count, bl // count, al // n))
    return bytes(out)


def write_png(path, size, raw):
    def chunk(tag, data):
        payload = tag + data
        return struct.pack(">I", len(data)) + payload + struct.pack(
            ">I", zlib.crc32(payload) & 0xFFFFFFFF
        )

    header = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)  # RGBA
    png = (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", header)
        + chunk(b"IDAT", zlib.compress(raw, 9))
        + chunk(b"IEND", b"")
    )
    path.write_bytes(png)
    print(f"{path.name}  {len(png) // 1024} Ko")


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    for size in (192, 512):
        write_png(OUT / f"icon-{size}.png", size, render(size))
    write_png(OUT / "icon-maskable-512.png", 512, render(512, maskable=True))
    write_png(OUT / "apple-touch-icon.png", 180, render(180))
