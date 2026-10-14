"""Vectorise logo-source.png (crème sur bleu nuit) en SVG monochrome : uv run --with pillow --with numpy --with potracer python3 docs/refonte/logo/vectoriser.py"""
import os
import numpy as np
from PIL import Image
import potrace

here = os.path.dirname(os.path.abspath(__file__))
im = Image.open(os.path.join(here, "logo-source.png")).convert("L")
a = np.array(im)
mask = a > 128  # le logo est clair sur fond sombre
bm = potrace.Bitmap(~mask)  # potracer trace les pixels « sombres » : on inverse
plist = bm.trace(turdsize=20, turnpolicy=potrace.POTRACE_TURNPOLICY_MINORITY, alphamax=1.0, opticurve=True, opttolerance=0.4)
h, w = a.shape
parts = []
for curve in plist:
    fs = curve.start_point
    d = [f"M{fs.x:.1f},{fs.y:.1f}"]
    for seg in curve.segments:
        if seg.is_corner:
            d.append(f"L{seg.c.x:.1f},{seg.c.y:.1f}L{seg.end_point.x:.1f},{seg.end_point.y:.1f}")
        else:
            d.append(f"C{seg.c1.x:.1f},{seg.c1.y:.1f} {seg.c2.x:.1f},{seg.c2.y:.1f} {seg.end_point.x:.1f},{seg.end_point.y:.1f}")
    d.append("Z")
    parts.append("".join(d))
path = "".join(parts)
# Recadrage serré sur le logo
ys, xs = np.where(mask)
x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
pad = 4
vb = f"{x0 - pad} {y0 - pad} {x1 - x0 + 2 * pad} {y1 - y0 + 2 * pad}"
svg = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" fill="currentColor" fill-rule="evenodd"><path d="{path}"/></svg>\n'
open(os.path.join(here, "logo.svg"), "w").write(svg)
print("viewBox", vb, "octets", len(svg), "sous-chemins", len(plist))
