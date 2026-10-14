# Stories de la refonte (un commit par story, sur `feat/refonte-identite-visuelle`)

| N° | Story | Contenu |
|---|---|---|
| R0 | Contrat | DESIGN.md, EXPERIENCE.md, `docs/ui-rules.md` (fait) |
| R1 | Jetons et polices | `app/globals.css` (jetons clair/sombre, `filet`, `chart-1..5`, dégradés recolorés (papier vers orange couchant) (`gradient-1..2`), suppression de `warning-icon`), `tailwind.config.ts`, `next/font` Hanken Grotesk + IBM Plex Mono, `lib/theme.test.ts` adapté |
| R2 | Composants | bouton, champ, tableau, pastille de statut, carte KPI, palette ⌘K |
| R3 | Écrans existants | page de connexion (scène B avec texte), notes, assistant, recherche |
| R4 | Cockpit | « Aujourd'hui » (chiffres mono, jauge, tâches) : après l'epic 5 |
| R5 | Clients et fiche client | après la story 3.1 |
| R6 | Factures | après l'epic 4 |
| R7 | Vitrine publique | après l'epic 6 |

R4 à R7 suivent les epics fonctionnels : leurs écrans n'existent pas encore.
