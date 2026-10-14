"""Palettes candidates de la refonte (clair et sombre ensemble). Source unique : les aperçus HTML et le calcul des contrastes les lisent ici.

Jetons : paper (fond), surface (second papier, rare), ink (texte), muted (texte secondaire), rule (filet décoratif, 1 px),
rule_strong (bordure de champ, séparation de grande section), signature (la seule couleur vive), on_signature (texte sur signature),
success / attention / danger (statuts, jamais la signature), charts (graphiques, séparés de la signature).
"""

CHARTS_LIGHT = ["#730D0D", "#109372", "#937210", "#302060", "#B814B8"]
CHARTS_DARK = ["#75D1F0", "#CCE6B3", "#B275F0", "#EBC247", "#EB4770"]

PALETTES = {
    "1-olive": {
        "nom": "Olive affinée",
        "idee": "Ta palette actuelle resserrée : papier crème, encre olive-noir, l'olive comme seule couleur vive. Risque : l'olive est un vert, voisin du vert « succès ».",
        "light": dict(paper="#F6F4F1", surface="#EEEAE0", ink="#161D0B", muted="#505B3C", rule="#D5D0C2", rule_strong="#7A8161",
                      signature="#4B5D16", on_signature="#F6F4F1", success="#0B6E66", attention="#9A4A00", danger="#B3261E"),
        "dark": dict(paper="#12160B", surface="#1B2111", ink="#F0EDE2", muted="#B4BBA0", rule="#333B24", rule_strong="#7C8860",
                     signature="#BFD35F", on_signature="#12160B", success="#4FD1C0", attention="#FF9F43", danger="#FF8A80"),
    },
    "2-cobalt": {
        "nom": "Cobalt",
        "idee": "Papier chaud, encre noire, un bleu électrique de type éditorial suisse. Aucun statut n'est bleu : la signature ne se confond avec rien.",
        "light": dict(paper="#F7F6F2", surface="#EFEDE6", ink="#0F1115", muted="#4B5160", rule="#D9D6CC", rule_strong="#80858F",
                      signature="#1D3BFF", on_signature="#FFFFFF", success="#0A7A4B", attention="#9A5200", danger="#B3261E"),
        "dark": dict(paper="#0E1014", surface="#161A21", ink="#F2F1EC", muted="#A6ACBA", rule="#2A2F3A", rule_strong="#6A7287",
                     signature="#8195FF", on_signature="#0E1014", success="#5FD3A0", attention="#F5B547", danger="#FF8A80"),
    },
    "3-ultraviolet": {
        "nom": "Ultraviolet",
        "idee": "Papier neutre, encre quasi noire, un violet profond vif : le plus reconnaissable, sans rapport avec le vert, l'ambre ou le rouge des statuts.",
        "light": dict(paper="#F8F6F3", surface="#F0ECE6", ink="#14111B", muted="#524C60", rule="#DBD6CE", rule_strong="#8B8498",
                      signature="#5B21D6", on_signature="#FFFFFF", success="#0A7A4B", attention="#9A5200", danger="#B3261E"),
        "dark": dict(paper="#100E16", surface="#18151F", ink="#F3F0F7", muted="#ADA6BC", rule="#2C2838", rule_strong="#6F6885",
                     signature="#B49BFF", on_signature="#100E16", success="#5FD3A0", attention="#F5B547", danger="#FF8A80"),
    },
}

# Dégradés (160 degrés, statiques) : (début, fin, couleur de texte autorisée ou None). Teintes douces (papier vers orange couchant), jamais un statut ni une série de graphique.
GRADIENTS = {
    "light": {"gradient-1": ("#F7F6F2", "#EFEDE6", "#0F1115"), "gradient-2": ("#F7F6F2", "#FFAE7A", "#0F1115")},
    "dark": {"gradient-1": ("#0E1014", "#161A21", "#F2F1EC"), "gradient-2": ("#161A21", "#7A3510", "#F2F1EC")},
}
