---
title: 'Clients : une seule rangée de filtres, filtre « Devis en attente » et pastille « Devis envoyé »'
type: 'feature'
created: '2026-10-29'
status: 'in-progress'
route: 'dispatch'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** la page Clients (`app/(app)/clients/page.tsx`) affiche deux rangées de filtres (statut, puis origine), jugées trop lourdes ; et la tuile « Devis » du cockpit (`KpiTile href="/clients"`) mène à la liste complète sans montrer quelles fiches ont un devis envoyé.

**Approach (choix d'Alex du 29 octobre) :** (1) regrouper les filtres sur **une seule rangée compacte** ; (2) ajouter un filtre **« Devis en attente »** (`?devis=attente`) et une **pastille « Devis envoyé »** sur chaque fiche concernée, avec montant et date au survol ; (3) la tuile « Devis » du cockpit mène à ce filtre. Pas de nouvelle page.

## Boundaries & Constraints

**Always:** l'état des filtres reste dans l'adresse (liens, pas de JavaScript client pour filtrer) ; les trois filtres se combinent (`statut`, `origine`, `devis`) ; toute valeur inconnue de `devis` est ignorée ; le filtre actif porte `aria-current` ; cibles tactiles de 44 px sur téléphone (comme `FilterChips`) ; un devis « en attente » = statut `sent` (la même définition que la tuile du cockpit et `listSentQuotes`) ; montant affiché **HT** et, seulement si la taxe est connue (`tax_cents` non nul), le total TTC (`totalCents`) ; jamais de montant présenté comme TTC quand la taxe est inconnue ; la RLS limite aux données du propriétaire (aucune requête sans elle) ; interface en français.

**Never:** nouvelle page, nouvelle dépendance, migration ; modifier les devis, leurs statuts ou leurs actions ; changer la définition de `kpis.quotesSent` (nombre de devis envoyés, pas de fiches) ; le survol comme seul moyen d'accès à l'information (le texte complet est aussi lu par les lecteurs d'écran).

## Décision de conception (validée par Alex le 29 octobre)

**Une seule rangée qui passe à la ligne si besoin : « Tous · Prospects · Clients · Devis en attente », un simple espacement (pas de trait), puis les cinq origines en pastilles** (« Toutes origines · Client réel · Formation · Ami · Démo »). Deux groupes de liens (`nav`) distincts restent côte à côte dans la même rangée, pour les lecteurs d'écran. Pas de menu déroulant.

## I/O & Edge-Case Matrix

| Scénario | Entrée / état | Comportement attendu |
|----------|---------------|----------------------|
| Filtre devis | `?devis=attente` | seules les fiches ayant au moins un devis `sent` ; combiné avec `statut` et `origine` |
| Valeur inconnue | `?devis=xyz` | ignorée : liste non filtrée |
| Pastille, un devis | un devis `sent` | « Devis envoyé » ; survol : « 1 200,00 € HT, envoyé le 12 oct. 2026 » (+ « 1 440,00 € TTC » si taxe connue) |
| Pastille, plusieurs | 2 devis `sent` | « 2 devis envoyés » ; survol : une ligne par devis |
| Date d'envoi absente | `sent_on` nul | « date d'envoi à confirmer » (jamais une date inventée) |
| Aucun résultat | filtre sans fiche | « Aucune fiche ne correspond à ces filtres. » |
| Tuile du cockpit | clic sur « Devis » | `/clients?devis=attente` |
| Tuile et liste | 2 devis sur la même fiche | tuile « 2 », liste « 1 fiche » avec « 2 devis envoyés » : voulu, noté dans l'aide de la tuile si besoin |
| Lien du filtre actif | clic sur « Devis en attente » déjà actif | retire le filtre (comme « Tous » pour le statut) |

</frozen-after-approval>

## Code Map

- `lib/domain/clients.ts` : `ClientView` (+ `devis: boolean`), `parseClientView`, `clientsHref`, `viewClients` (+ ensemble des `client_id` avec devis envoyé).
- `lib/db/quotes.ts` : nouvelle lecture des devis envoyés avec montant, taxe, date (`listSentQuotes` garde sa forme pour le cockpit).
- `lib/domain/quotes.ts` : `totalCents`, `formatCents` (existants).
- `app/(app)/clients/page.tsx` : une rangée, menu d'origine, pastille.
- `app/(app)/aujourd-hui/page.tsx` : `href` de la tuile.
- Tests : `lib/domain/clients.test.ts` (parse, href, filtre, combinaisons), libellé de la pastille (fonction pure du domaine), test de composant de la rangée de filtres.

## Tasks & Acceptance

- [ ] Domaine : `devis` dans la vue, l'adresse et le filtrage ; libellé de pastille et de survol (fonction pure testée, taxe connue / inconnue, date absente, un ou plusieurs devis).
- [ ] Lecture des devis envoyés avec montant, taxe et date.
- [ ] Page : rangée unique (deux groupes côte à côte), pastille, filtre actif retirable.
- [ ] Cockpit : la tuile mène à `/clients?devis=attente`.
- [ ] Mutations à la main (filtre ignoré, `sent` remplacé par un autre statut, TTC affiché sans taxe, pluriel, `href` de la tuile) : toutes détectées.
- [ ] Journal, dette, 3 relecteurs, `npm test`, `tsc`, lint, `next build` en copie propre.
- [ ] Contrôle visuel à faire par Alex : `/clients` en thème clair et sombre, téléphone, clavier, compte de démo avec au moins un devis envoyé.

**Acceptation :** aucune fiche sans devis envoyé dans `?devis=attente` ; la tuile du cockpit et la liste filtrée concordent (même définition) ; les filtres se parcourent au clavier ; aucun montant TTC sans taxe connue.

## Review Triage Log

(29 octobre 2026, 3 relecteurs, 17 constats)

Corrigés : ordre stable des devis (`.order("id")` en second critère) ; limite de 1 000 lignes de PostgREST nommée (`ponytail:`) ; test de la requête (le statut `sent` est lu dans le source : la mutation « autre statut » est maintenant détectée) ; test de composant de `FilterChips` (`aria-current`, adresses, bascule « Devis en attente » qui garde les autres filtres) ; spec : espacement et non séparateur (aucun trait, les groupes restent distincts à l'écran).
Reportés (dette) : détail de la pastille inaccessible au toucher et au clavier (le survol était le choix d'Alex ; le texte complet reste lu par les lecteurs d'écran) ; zone morte du clic sur la pastille (elle passe au-dessus du lien étendu de la ligne) ; pagination des devis au-delà de 1 000 ; test de la page (rangée, pastille, `title`) ; test à deux comptes de `listSentQuoteAmounts` (même RLS que `listSentQuotes`).
Rejetés : `withSentQuote` obligatoire (un seul appelant) ; `aria-current` sur le bouton de bascule (motif du projet) ; « HT, TTC » avec taxe 0 redondant (taxe connue, voulu).
