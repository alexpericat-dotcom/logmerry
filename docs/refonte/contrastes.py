"""Calcul des contrastes et des contrôles de la refonte : python3 docs/refonte/contrastes.py [--md]

Règles : texte >= 4,5:1 ; éléments d'interface (bordure de champ, focus, icône d'état, graphique) >= 3:1 ;
la signature ne se confond avec aucun statut (écart de teinte >= 40 degrés) ; couleurs de graphique distinctes pour les
trois formes de daltonisme (écart Lab >= 15, simulation de Machado 2009 à sévérité 1).
"""
import colorsys, itertools, sys
from palettes import PALETTES, CHARTS_LIGHT, CHARTS_DARK, GRADIENTS

def rgb(h): h = h.lstrip("#"); return [int(h[i:i+2], 16) / 255 for i in (0, 2, 4)]
def lin(c): return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
def lum(h): r, g, b = (lin(c) for c in rgb(h)); return 0.2126 * r + 0.7152 * g + 0.0722 * b
def ratio(a, b): x, y = sorted((lum(a), lum(b)), reverse=True); return (x + 0.05) / (y + 0.05)
def hue(h): r, g, b = rgb(h); return colorsys.rgb_to_hsv(r, g, b)[0] * 360
def hue_gap(a, b): d = abs(hue(a) - hue(b)) % 360; return min(d, 360 - d)

CVD = {  # matrices de Machado et al. 2009, sévérité 1, appliquées en RGB linéaire
    "deutéranopie": [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.011820, 0.042940, 0.968881]],
    "protanopie": [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
    "tritanopie": [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.303900]],
}
def simulate(h, m): v = [lin(c) for c in rgb(h)]; return [max(0, min(1, sum(m[i][j] * v[j] for j in range(3)))) for i in range(3)]
def lab(c):
    r, g, b = c
    x = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047; y = 0.2126 * r + 0.7152 * g + 0.0722 * b; z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883
    f = lambda t: t ** (1 / 3) if t > 0.008856 else 7.787 * t + 16 / 116
    return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))]
def dE(a, b): return sum((p - q) ** 2 for p, q in zip(a, b)) ** 0.5

def checks(theme, t, charts):
    out = []
    add = lambda nom, a, b, seuil: out.append((nom, ratio(a, b), seuil))
    add("encre / papier", t["ink"], t["paper"], 4.5); add("encre / surface", t["ink"], t["surface"], 4.5)
    add("texte secondaire / papier", t["muted"], t["paper"], 4.5); add("texte secondaire / surface", t["muted"], t["surface"], 4.5)
    add("signature en texte ou lien / papier", t["signature"], t["paper"], 4.5); add("signature / surface", t["signature"], t["surface"], 4.5)
    add("texte sur signature (bouton)", t["on_signature"], t["signature"], 4.5)
    for s in ("success", "attention", "danger"):
        add(f"{s} (texte et icône) / papier", t[s], t["paper"], 4.5); add(f"{s} / surface", t[s], t["surface"], 4.5)
    add("bordure de champ / papier", t["rule_strong"], t["paper"], 3.0); add("bordure de champ / surface", t["rule_strong"], t["surface"], 3.0)
    add("anneau de focus (signature) / papier", t["signature"], t["paper"], 3.0)
    for i, c in enumerate(charts, 1):
        add(f"graphique {i} / papier", c, t["paper"], 3.0); add(f"graphique {i} / surface", c, t["surface"], 3.0)
    return out

def confusions(t):
    return [(s, hue_gap(t["signature"], t[s])) for s in ("success", "attention", "danger")]

def cvd_min(charts):
    worst = (999, None)
    for nom, m in CVD.items():
        labs = [lab(simulate(c, m)) for c in charts]
        for (i, a), (j, b) in itertools.combinations(enumerate(labs), 2):
            d = dE(a, b)
            if d < worst[0]: worst = (d, f"{nom}, graphiques {i+1} et {j+1}")
    return worst

def run():
    md = "--md" in sys.argv
    problems = 0
    for key, p in PALETTES.items():
        for theme, charts in (("light", CHARTS_LIGHT), ("dark", CHARTS_DARK)):
            t = p[theme]
            print(f"\n## {key} ({p['nom']}), thème {'clair' if theme == 'light' else 'sombre'}" if md else f"\n=== {key} / {theme}")
            if md: print("\n| Couple | Ratio | Seuil | |\n|---|---|---|---|")
            for nom, r, seuil in checks(theme, t, charts):
                ok = r >= seuil; problems += not ok
                print(f"| {nom} | {r:.2f} | {seuil} | {'OK' if ok else 'ÉCHEC'} |" if md else f"  {'OK   ' if ok else 'ÉCHEC'} {r:5.2f} (>= {seuil})  {nom}")
            for s, g in confusions(t):
                ok = g >= 40; problems += not ok
                print(f"{'  ' if not md else '- '}{'OK   ' if ok else 'ÉCHEC'} écart de teinte signature / {s} : {g:.0f} degrés (>= 40)")
    for theme, charts in (("clair", CHARTS_LIGHT), ("sombre", CHARTS_DARK)):
        d, qui = cvd_min(charts); ok = d >= 15; problems += not ok
        print(f"\n{'OK   ' if ok else 'ÉCHEC'} graphiques {theme} : écart minimal en daltonisme = {d:.1f} (>= 15) ({qui})")
    for theme, gs in GRADIENTS.items():
        for nom, (a, b, txt) in gs.items():
            r = min(ratio(a, txt), ratio(b, txt)); ok = r >= 4.5; problems += not ok
            print(f"{'OK   ' if ok else 'ÉCHEC'} dégradé {nom} ({theme}) : texte {txt} / pire extrémité = {r:.2f} (>= 4,5)")
    print(f"\n{problems} problème(s)")
    return problems

if __name__ == "__main__": raise SystemExit(1 if run() else 0)
