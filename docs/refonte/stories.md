# Stories de la refonte (un commit par story, sur `feat/refonte-identite-visuelle`)

| N° | Story | Contenu |
|---|---|---|
| R0 | Contrat | DESIGN.md, EXPERIENCE.md, `docs/ui-rules.md` (fait) |
| R1 (fait) | Jetons et polices | `app/globals.css` (jetons clair/sombre, `filet`, `chart-1..5`, dégradés recolorés (« couchant » multi-couches) (`gradient-1..2`), suppression de `warning-icon`), `tailwind.config.ts`, `next/font` Hanken Grotesk + IBM Plex Mono, `lib/theme.test.ts` adapté |
| R2 (fait) | Composants | bouton (dégradé d'action, gras, focus rose), champ et menu déroulant, pastilles (type, brouillon, états), palette ⌘K sur `popover`. **Tableau de données et carte KPI reportés** à R4/R5 : leurs écrans n'existent pas encore, ils se construisent avec eux |
| R3 | Écrans existants | page de connexion (scène B avec texte), notes, assistant, recherche |
| R4 | Cockpit | « Aujourd'hui » (chiffres mono, jauge, tâches) : après l'epic 5 |
| R5 | Clients et fiche client | après la story 3.1 |
| R6 | Factures | après l'epic 4 |
| R7 | Vitrine publique | après l'epic 6 |

| R8 | Mobile | Reprise de l'affichage sur téléphone (retour d'Alex sur Pixel 6a, 2026-10-14 : « pas dingue ») : barre latérale, bandeau, assistant plein écran, filtres, pastilles, cibles tactiles ≥ 44 px ; à tester sur le vrai téléphone, écran par écran |

| R9 | Arcade clair | Nouveau thème clair rétro pixel (2026-10-15) : combinaison « bandeau et connexion Arcade clair, listes et formulaires Pixel sobre » ; jetons clairs, traits marine, ombres dures, Pixelify Sans, accents `tone-*`, portrait et scènes d'Alex, DESIGN.md et règles mis à jour. Le sombre est inchangé. À essayer sur le vrai téléphone |

R4 à R7 suivent les epics fonctionnels : leurs écrans n'existent pas encore.
