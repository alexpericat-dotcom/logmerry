"""Dégradé « couchant » : rendu dans Chrome puis contraste du texte mesuré sur les pixels de la zone de texte (45 % du haut du panneau).
Usage : uv run --with pillow python3 docs/refonte/degrades.py   (écrit un PNG par thème dans le dossier courant de sortie donné en argument 1)
"""
import subprocess, sys, os, tempfile
from PIL import Image
from contrastes import ratio
from palettes import GRADIENT_SUNSET

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
W, H = 480, 300

def lum_hex(rgb): return "#%02X%02X%02X" % rgb

def measure(theme, out_dir):
    g = GRADIENT_SUNSET[theme]
    html = f'<html><body style="margin:0"><div style="width:{W}px;height:{H}px;background:{g["css"]}"></div></body></html>'
    f = os.path.join(out_dir, f"couchant-{theme}.html"); open(f, "w").write(html)
    png = os.path.join(out_dir, f"couchant-{theme}.png")
    subprocess.run([CHROME, "--headless=new", f"--screenshot={png}", f"--window-size={W},{H}", "--hide-scrollbars", "file://" + f], capture_output=True)
    im = Image.open(png).convert("RGB")
    worst = 99
    for y in range(0, int(H * 0.45), 3):
        for x in range(0, W, 3):
            worst = min(worst, ratio(g["text"], lum_hex(im.getpixel((x, y)))))
    return worst

if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else tempfile.mkdtemp()
    bad = 0
    for theme in GRADIENT_SUNSET:
        w = measure(theme, out); ok = w >= 4.5; bad += not ok
        print(f"{'OK   ' if ok else 'ÉCHEC'} couchant ({theme}) : texte {GRADIENT_SUNSET[theme]['text']} sur les 45 % du haut, pire pixel = {w:.2f} (>= 4,5)")
    raise SystemExit(bad)
