---
title: 'Story 8.7 : La recherche ne fuit pas entre comptes'
type: 'feature'
created: '2026-10-13'
status: 'done'
baseline_commit: '0a253caae5c79a281582663bce591b9453f81e96'
route: 'oneshot'
review_loop_iteration: 0
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** la recherche par sens est la partie qui pourrait montrer à un compte le texte d'un autre ; la story 8.5 l'a prouvé avec des vecteurs artificiels, pas avec de vrais textes qui se ressemblent.

**Approach:** un script `npm run test:leak` (`tests/leak-search.test.ts`), hors de `npm test`, avec les deux comptes fictifs (@example.com seulement) : il indexe pour A et pour B des notes fictives sur des sujets proches, avec de vrais vecteurs `mistral-embed`, puis interroge `match_chunks` en sens inverse sur les sujets de l'autre, avec un seuil à 0 et la limite maximale pour maximiser les chances de fuite. Un seul extrait ou une seule note d'un autre compte fait échouer le test ; un contrôle sur le détecteur lui-même prouve qu'il échoue bien quand une fuite existe ; lecture directe de `note_chunks` par l'autre compte vide. Le test est décrit et son résultat noté dans `docs/rag-tests.md` (nouveau fichier, avec une section « Jeu de questions » à rédiger pour la story 8.14, non inventée ici) et dans `docs/journal.md`. Aucune migration, aucun code d'application.

</frozen-after-approval>

## Implementation Notes

Fichiers : `tests/leak-search.test.ts`, script `test:leak` dans `package.json`, `docs/rag-tests.md` (nouveau : test de fuite documenté, jeu de questions laissé à rédiger pour la story 8.14). Pas de migration, pas de code d'application. 8 vérifications sur 8 avec de vrais vecteurs `mistral-embed` et les deux comptes fictifs ; aucune note de test restante (vérifié en base, lecture seule). Limites écrites dans `docs/rag-tests.md` : le test n'exerce pas le découpage ni la Server Action d'indexation, et pas les écritures (couvertes par `test:isolation`).

## Review Triage Log

| Constat | Verdict | Route | Preuve / décision |
|---|---|---|---|
| Le « contrôle » comparait les résultats de A à la liste de B (disjointes par construction) : il ne prouvait rien et la doc le survendait | high | patch | remplacé par un contrôle du détecteur (un seul extrait interdit est signalé, les siens passent) ; la doc dit qu'il vérifie le détecteur, pas la base |
| Un compte de démo avec d'autres extraits aurait provoqué de faux échecs (critère « pas à moi ») | high | patch | critère inversé : seuls les extraits et notes de l'autre compte comptent ; le test exige aussi au moins un extrait à soi |
| Nettoyage non vérifié, seulement un avertissement | medium | patch | erreur de suppression et reste en base font échouer le test |
| Seuil 0,76 et limite 8 recopiés dans le test | medium | patch | importés de `lib/domain/matching.ts` |
| Échec de Mistral pris pour un échec d'isolation, réponse non validée | medium | patch | message « TEST NON CONCLUANT (pas une fuite) », nombre et dimension des vecteurs vérifiés |
| Questions vectorisées plusieurs fois (8 appels) | low | patch | une seule fois dans `before` |
| Résultat pré-rempli avec une mauvaise date | medium | patch | ligne remplie après l'exécution réelle ; toutes les dates erronées « 2026-10-14 » corrigées en 2026-10-13 dans le dépôt |
| Le seuil réel peut ne rien renvoyer et ne rien prouver | low | patch | commentaire ajouté ; le test à seuil 0 est celui qui prouve |
| Doc muette sur l'échec, le CI, l'absence du fichier d'identifiants | medium | patch | section « Si le test échoue », limites et « pas de déclenchement automatique » ajoutées |
| Écritures chez l'autre (insérer, modifier, supprimer) non couvertes ici | low | rejeté | déjà couvertes par `test:isolation` (stories 2.3, 8.1, 8.3), noté dans la doc |
| Chemin d'indexation réel non exercé | low | rejeté | vérifié de bout en bout aux stories 8.3 et 8.6 ; limite écrite dans la doc |
| Nouvel essai sur 429 ou 5xx | low | rejeté | relancer à la main ; message explicite |
| `foreignRows` exportée depuis un fichier de test | low | rejeté | sans effet ; la fonction est renommée `leaked` |
| Préfixe `[leak-test]` dans le texte vectorisé et pas dans les questions | low | rejeté | écart minime de similarité, sans effet sur la fuite |

