"""Propositions de fond pour le thème clair : python3 docs/refonte/fonds_clairs.py (écrit apercu-fond-<n>.html, vérifie les contrastes)."""
import colorsys, copy, os
from contrastes import ratio
from palettes import PALETTES
import build_previews as bp

FONDS = {
    "a-sable": ("Sable chaud", "#F0E9DC", "#E6DECE", "#D3C9B5", "Chaleureux, proche du papier ancien ; se marie bien avec le corail du dégradé."),
    "b-lavande": ("Lavande brume", "#EFEBF5", "#E5DFF0", "#CFC8DE", "Reprend la lavande du dégradé « couchant » : l'ambiance la plus cohérente avec les bandeaux."),
    "c-rose": ("Rose poudré", "#F7ECE9", "#EEE0DC", "#DCCBC6", "Doux et chaud, rappelle le rose des boutons ; risque de paraître « féminin » ou fade."),
    "d-gris-bleu": ("Gris-bleu froid", "#ECEFF3", "#E1E6EC", "#C9D0DA", "Sérieux, « outil », fait ressortir le dégradé chaud par contraste ; moins chaleureux."),
}

def darken(hex_, bgs, need):
    """Assombrit la couleur par petits pas jusqu'au contraste voulu sur tous les fonds."""
    r, g, b = [int(hex_[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    h, l, sat = colorsys.rgb_to_hls(r, g, b)
    while l > 0.05 and min(ratio("#%02X%02X%02X" % tuple(round(c * 255) for c in colorsys.hls_to_rgb(h, l, sat)), bg) for bg in bgs) < need:
        l -= 0.005
    return "#%02X%02X%02X" % tuple(round(c * 255) for c in colorsys.hls_to_rgb(h, l, sat))

def variant(k):
    nom, paper, surface, rule, _ = FONDS[k]
    p = copy.deepcopy(PALETTES["2-cobalt"])
    p["light"].update(paper=paper, surface=surface, rule=rule)
    t = p["light"]
    for tok, need in (("success", 4.5), ("attention", 4.5), ("danger", 4.5), ("signature", 4.5), ("muted", 4.5), ("rule_strong", 3.0), ("ring", 3.0)):
        t[tok] = darken(t[tok], (paper, surface), need)  # ne change que ce que le nouveau fond fait échouer
    p["nom"] = f"Cobalt · fond {nom}"
    return p

def check(p):
    t = p["light"]; bad = []
    for fg in ("ink", "muted", "signature", "success", "attention", "danger"):
        for bg in ("paper", "surface"):
            r = ratio(t[fg], t[bg])
            if r < 4.5: bad.append(f"{fg}/{bg} {r:.2f} < 4,5")
    for fg in ("rule_strong", "ring"):
        for bg in ("paper", "surface"):
            r = ratio(t[fg], t[bg])
            if r < 3: bad.append(f"{fg}/{bg} {r:.2f} < 3")
    return bad

if __name__ == "__main__":
    here = os.path.dirname(os.path.abspath(__file__))
    for k in FONDS:
        p = variant(k); bad = check(p); t = p["light"]
        print(f"{k:12s} {FONDS[k][0]:16s} texte/fond {ratio(t['ink'], t['paper']):.2f}  secondaire {ratio(t['muted'], t['paper']):.2f}  succès {ratio(t['success'], t['paper']):.2f}/{ratio(t['success'], t['surface']):.2f}  bordure champ {ratio(t['rule_strong'], t['paper']):.2f}/{ratio(t['rule_strong'], t['surface']):.2f}  ->", "OK" if not bad else "; ".join(bad))
        changed = {tok: v for tok, v in t.items() if v != PALETTES["2-cobalt"]["light"].get(tok) and tok in ("success", "attention", "danger", "signature", "muted", "rule_strong", "ring")}
        print("   jetons assombris :", changed or "aucun")
        open(os.path.join(here, f"apercu-fond-{k}.html"), "w", encoding="utf-8").write(bp.page("2-cobalt", p).replace("Direction 2-cobalt", "Fond clair " + FONDS[k][0]).replace("#F7F6F2", FONDS[k][1]).replace("if(matchMedia('(prefers-color-scheme: dark)').matches)document.getElementById('t').click();", ""))
