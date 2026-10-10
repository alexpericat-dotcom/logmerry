# Réconciliation : forged-idea.md vs prd.md + addendum.md

Entrée : `_bmad-output/forge/logmerry-mvp/forged-idea.md`. Les raffinements assumés (calcul par code, phasage, seuil 18/20, catalogue d'outils) ne sont pas listés.

## Repris correctement
Données (base unique, purge, portfolio conservé), MCP débranché, jalon 30 octobre avec règle « RAG d'abord », citations en 6 étapes, jeu de test à 3 familles, chat en fonction Supabase, n8n asynchrone seulement, critères d'embeddings, options écartées (colonne « fictif », second projet Supabase, n8n pour le chat). Ces points sont dans le PRD ou l'addendum.

## Écarts réels

1. **Contrainte « la date, pas les heures » absente.**
   - Forgé : fin de formation le 8 février 2027 ; WS8 de 130 h = estimation dépassable ; capacité déclarée 35 h/sem sauf la semaine du 12 octobre ; reste ~195 h (WS8 + WS9 + WS10).
   - PRD : seul le jalon du 30 octobre apparaît. Ni la date butoir, ni la capacité, ni le budget d'heures ne sont écrits. Les étapes suivantes (épics, planning) n'auront pas la contrainte qui fixe le périmètre.

2. **Option écartée « sacrifier du périmètre pour tenir 130 h » non reprise, et affaiblie.**
   - Forgé : refusé, parce que la contrainte réelle est la date.
   - PRD et addendum : cette option n'est pas dans la liste des écartées. FR-17 et FR-18 sont « si le calendrier le permet » et « premier à couper » (§4.8, §7.2), ce qui revient à un mécanisme de coupe que l'auteur n'a pas retenu. À clarifier : coupe autorisée sur le seul catalogue d'outils, ou conflit avec la décision.

3. **Point ouvert « 35 h/sem sur ~17 semaines : déclaré, non vérifié » absent.**
   - Ni §9 ni §10 (hypothèses) ne le portent, alors que le PRD indexe les autres hypothèses non vérifiées (statut, valeurs fiscales).

4. **Point ouvert « le CRM se justifie surtout par le RAG (10-20 entités) : à garder sous contrôle de périmètre » absent.**
   - Le PRD pose FR-7 et FR-8 comme MVP, sans garde-fou de volume ni mention de cette justification. Risque de dérive de périmètre, que le forgé voulait justement surveiller.

5. **Mineur : précisions de méthode partiellement perdues.**
   - Forgé : choix des embeddings via `bmad-deep-recon` type `technical`, avant la première migration. PRD §9.3 garde `bmad-deep-recon` sans le type.
   - Forgé : « MCP autorisé tant que la base est fictive ». Le PRD ne dit que le débranchement. La condition d'autorisation pendant le WS8 n'y figure pas.

## Contradictions franches
Aucune. Le PRD ne renverse aucune décision verrouillée.
