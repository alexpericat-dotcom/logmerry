# Décisions de l'auteur sur les finances (epic 4) et le cockpit (epic 5)

Journal de travail du contrôle de préparation du 18 octobre 2026. Chaque décision est reportée ensuite dans le PRD, les epics et l'UX par les skills BMAD concernés ; ce fichier garde la trace de ce qui a été tranché, et de ce qui reste ouvert. **Aucune valeur fiscale n'est écrite ici** : elles sont saisies par l'auteur dans la page Paramètres (story 4.1), avec leur source et leur date de vérification.

## Tranché

1. **Statut :** micro-entreprise, activité BNC (prestations libérales), comme le dit le PRD. Déclaré par l'auteur, **à confirmer à la source** dans la story 4.1 (le statut est lui-même un paramètre avec source et date).
2. **Immatriculation :** pas encore de date. Les règles qui en dépendent (prorata de la première année, fin de l'ACRE, règle 4 du cockpit) affichent « paramètre manquant » tant que la date de début d'activité n'est pas saisie. Les cas de référence utilisent une **date fictive, étiquetée comme telle**, jamais une valeur réelle.

3. **Spec « cockpit financier » (18 octobre) :** écrite par l'auteur avec l'aide de Claude (conversation externe), versée dans `spec-cockpit-financier.md` (ses modules 1 à 5 n'existent pas). **Périmètre du MVP : les modules 6 (plafonds), 7 (calendrier), 9 (règles versionnées) et 10 (profil professionnel) entrent dans les epics 4 et 5 ; les modules A (vue d'ensemble), B (objectifs) et 8 (ARE) sont une phase suivante** (option « b » de l'auteur).
4. **Plafonds :** plusieurs plafonds distincts, chacun calculé sur le chiffre d'affaires pertinent pour sa règle (jamais le même montant réutilisé), alertes configurables à 50, 75, 90 et 100 % (module 6).
5. **Donnée inconnue :** état « À confirmer », jamais une valeur par défaut (modules 9 et 10). Conséquence : plusieurs points ouverts disparaissent comme décisions à prendre maintenant, ils deviennent des **champs du profil** (statut, régime fiscal, catégorie, fréquence des déclarations, régime de TVA, ACRE, date de début d'activité), tous « À confirmer » au départ.

## Ce qui n'est plus une question maintenant
- Un ou deux plafonds : plusieurs, selon les règles (décision 4).
- Hors taxe ou toutes taxes comprises, fréquence de déclaration, ACRE : champs du profil et paramètres de règles, saisis avec leur source (décision 5).
- « Prorata de la première année » et « bascule de TVA » : ce sont des règles versionnées (date d'effet, source, tests) à écrire quand l'auteur aura les sources ; elles ne se devinent pas.

## À trancher (dans l'ordre)

- Règle 5 du cockpit : devis seulement, ou aussi les prospects.
- Règle 6 du cockpit : ce que veut dire « planifié » (avec les sprints).
- Devis accepté : ce que veut dire « mission créée ou confirmée ».
- Septième règle du cockpit (sprint) et affichage « Client / Mission / Sprint X ».
- Module 8 (ARE) : confirmer qu'il reste après le MVP (l'auteur n'a pas encore répondu).
- Les 6 cas de référence calculés à la main (prérequis de FR-11), à réécrire comme « tests associés » des règles (module 9).
- Sécurité : la table `parameters` devient-elle la table de règles versionnées (colonnes ajoutées) ou y a-t-il une table de règles à part ? À trancher avec `bmad-architecture`.
