# Décisions de l'auteur sur les finances (epic 4) et le cockpit (epic 5)

Journal de travail du contrôle de préparation du 18 octobre 2026. Chaque décision est reportée ensuite dans le PRD, les epics et l'UX par les skills BMAD concernés ; ce fichier garde la trace de ce qui a été tranché, et de ce qui reste ouvert. **Aucune valeur fiscale n'est écrite ici** : elles sont saisies par l'auteur dans la page Paramètres (story 4.1), avec leur source et leur date de vérification.

## Tranché

1. **Statut :** micro-entreprise, activité BNC (prestations libérales), comme le dit le PRD. Déclaré par l'auteur, **à confirmer à la source** dans la story 4.1 (le statut est lui-même un paramètre avec source et date).
2. **Immatriculation :** pas encore de date. Les règles qui en dépendent (prorata de la première année, fin de l'ACRE, règle 4 du cockpit) affichent « paramètre manquant » tant que la date de début d'activité n'est pas saisie. Les cas de référence utilisent une **date fictive, étiquetée comme telle**, jamais une valeur réelle.

3. **Spec « cockpit financier » (18 octobre) :** écrite par l'auteur avec l'aide de Claude (conversation externe), versée dans `spec-cockpit-financier.md` (ses modules 1 à 5 n'existent pas). **Périmètre du MVP : les modules 6 (plafonds), 7 (calendrier), 9 (règles versionnées) et 10 (profil professionnel) entrent dans les epics 4 et 5 ; les modules A (vue d'ensemble), B (objectifs) et 8 (ARE) sont une phase suivante** (option « b » de l'auteur).
4. **Plafonds :** plusieurs plafonds distincts, chacun calculé sur le chiffre d'affaires pertinent pour sa règle (jamais le même montant réutilisé), alertes configurables à 50, 75, 90 et 100 % (module 6).
5. **Donnée inconnue :** état « À confirmer », jamais une valeur par défaut (modules 9 et 10). Conséquence : plusieurs points ouverts disparaissent comme décisions à prendre maintenant, ils deviennent des **champs du profil** (statut, régime fiscal, catégorie, fréquence des déclarations, régime de TVA, ACRE, date de début d'activité), tous « À confirmer » au départ.
6. **Démo (18 octobre, après la relecture du PRD) :** le compte de démonstration reçoit des **règles d'essai fictives, étiquetées « DEMO, non officielle »**, réservées à ce compte (isolation par compte) et purgées au passage à l'outil pro ; elles ne se mélangent jamais aux vraies règles de l'auteur. Tant que les vraies règles ne sont pas confirmées à la source, le compte réel affiche « paramètre manquant ».7. **Règles :** données saisies et versionnées (valeurs, dates d'effet, sources) + formules en code testé qui les lit ; un changement de valeur est une **nouvelle version avec date d'effet**, l'ancienne gardant sa date de fin.
8. **Calendrier :** source unique des échéances ; le cockpit en tire ses tâches du jour ; cocher marque l'échéance faite.
9. **Alertes de plafond :** visibles dans l'application, seuils actifs choisis au profil, tâche du cockpit à 90 % puis 100 % ; pas de notification au MVP.
10. **Règle 5 du cockpit :** devis « envoyés » seulement. **Règle 6 :** moins de deux missions en cours ou devis envoyés. **Devis accepté sur un prospect :** le prospect devient client et la mission est créée automatiquement, titre « Devis du JJ/MM/AAAA — Nom du client », modifiable.
11. **Ordre de construction :** socle de règles et profil, factures, plafonds, cotisations, échéances simples puis calendrier complet ; on coupe d'abord les catégories et la récurrence du calendrier.
12. **Profil et assistant :** le profil peut être envoyé à l'assistant (seul utilisateur connecté), mention affichée, à revoir avant les données réelles.
13. **Suivi ARE :** confirmé après le MVP ; le MVP ne garde que le champ « situation France Travail » du profil.
14. **Montants :** factures et encaissements enregistrent le hors taxe et la taxe (le toutes taxes comprises s'en déduit) ; chaque règle de plafond choisit sa base.
15. **Cockpit et sprints :** trois tâches de sprint au plus, puis une ligne « N autres tâches dans ton sprint » qui renvoie à la mission.
16. **Architecture :** une seule table de règles versionnées, créée directement (la table `parameters` n'existe pas encore) ; une seule page « Règles ».

## Ce qui n'est plus une question maintenant
- Un ou deux plafonds : plusieurs, selon les règles (décision 4).
- Hors taxe ou toutes taxes comprises, fréquence de déclaration, ACRE : champs du profil et paramètres de règles, saisis avec leur source (décision 5).
- « Prorata de la première année » et « bascule de TVA » : ce sont des règles versionnées (date d'effet, source, tests) à écrire quand l'auteur aura les sources ; elles ne se devinent pas.

## À trancher (dans l'ordre)

- Période et catégories de recettes de la base de calcul de chaque plafond : avec la règle et sa source.
- Les 6 cas de référence calculés à la main, les règles de prorata, de bascule de TVA et de fin d'ACRE avec leurs sources, et les règles d'essai « DEMO » du compte de démonstration : à écrire par l'auteur.
- Sources et documents France Travail pour le suivi ARE (phase suivante).
