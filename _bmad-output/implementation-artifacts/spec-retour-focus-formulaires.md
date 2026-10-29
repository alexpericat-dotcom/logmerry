# Spec : retour du focus à la fermeture des formulaires d'ouverture (factures, devis, règles)

Origine : audit d'accessibilité 7.2, constat 3 (`docs/audit-accessibilite.md`). WCAG 2.4.3.

## Intent / Boundaries / Matrice I/O (figé)

**Intent.** Quand le formulaire qui remplace un bouton se ferme (« Annuler », Échap, ou envoi réussi), le focus revient au bouton qui l'a ouvert, comme dans `ContactsSection` (`wasAdding` + `useRef` + `useEffect`).

**Boutons concernés (3).**
- « Nouvelle facture » (`components/invoices-panel.tsx`, `newRef` existe déjà)
- « Nouveau devis » (`QuotesSection`, `components/quotes-section.tsx`)
- « Nouvelle version » / « Saisir la règle » (`components/rule-form.tsx`)

**Hors périmètre.** Les formulaires de modification en place (déjà gérés ou hors constat), les ouvertures (`FocusOnMount`, inchangé), la suppression d'une facture (déjà gérée), aucune nouvelle dépendance, aucun changement visuel.

| Événement | Résultat attendu |
|---|---|
| Premier rendu (formulaire fermé) | focus inchangé (pas de vol de focus) |
| Ouverture | focus sur le premier champ (inchangé) |
| Annuler / Échap (règle) | focus sur le bouton d'ouverture |
| Envoi réussi | focus sur le bouton d'ouverture |
| Envoi refusé (erreurs) | formulaire ouvert, focus sur le récapitulatif d'erreurs (inchangé) |
| Règle : envoi réussi | bouton rendu, message « Règle enregistrée » toujours annoncé |

## Plan
Dans chacun : `useRef` du bouton + `wasOpen` + `useEffect` sur l'état ouvert, calqué sur `ContactsSection`. Tests de composant : ouvrir, annuler, le focus est sur le bouton (`assert.ok(a === b)`). Mutations à la main : effet retiré, focus au premier rendu.

## Review Triage Log

3 relecteurs (Blind Hunter, Edge Case Hunter, Verification Gap), aucun bloquant.
- **Corrigé** : (1) `preventScroll` + `scrollIntoView` centré à la fermeture du formulaire de facture (comme `deleted()`, sinon le bouton se cale sous l'en-tête fixe) ; (2) test d'envoi refusé (formulaire ouvert, bouton absent, focus sur le récapitulatif) via `globalThis.__stubResult` dans les doublures ; (3) test du message « Règle enregistrée » ; (4) test d'un second cycle ouvrir/annuler.
- **Rejeté / noté** : bouton désactivé si `missions` tombe à 0 pendant l'ouverture (cas pratiquement impossible) ; focus déplacé pendant l'envoi puis ramené au bouton (accepté, comportement identique à `ContactsSection`) ; annonce double bouton + statut de la règle (à juger au lecteur d'écran) ; `key` dynamique de `RuleForm` (absente de la page) ; hook `useFocusOnClose` (trois usages, non nécessaire) ; types/paramètres des doublures (identiques à la convention existante).
- Mutations : six détectées (effet retiré, drapeau `wasX` retiré, dans chacun des trois composants).
