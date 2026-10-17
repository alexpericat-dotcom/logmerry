# Revue adversariale du PRD LogMerry (mise à jour du 18 octobre 2026)

Relecteur : adversarial, lecture seule. Périmètre : `prd.md` contre `spec-cockpit-financier.md`, `decisions-finances.md`, `epics.md` (3.6, 3.7, epics 4 et 5, plan des sprints), `ARCHITECTURE-SPINE.md` (AD-5, AD-8), `CLAUDE.md`, et `docs/journal.md` pour l'origine de la septième règle.

## Verdict

**À corriger avant l'architecture, les epics et l'UX (CONCERNS, proche de BLOCKED sur le point C1).** Le PRD est dans l'ensemble fidèle à la spec de l'auteur et honnête sur ses hypothèses. Mais trois choses empêchent un développeur d'avancer sans deviner :
1. le modèle « règle versionnée » n'est pas défini (données seules, ou données plus code) ;
2. le calendrier, les alertes et le cockpit utilisent « tâche », « priorité » et « alerte » dans plusieurs sens incompatibles ;
3. le statut `final` et la phrase « le calendrier n'impose aucune coupe » affirment plus que ce que le document établit.

Aucune valeur fiscale n'est codée dans le PRD, et la contrainte transverse est bien reprise. Les failles viennent du modèle, des états « À confirmer » et du périmètre, pas des chiffres.

## Comptage

| Gravité | Nombre |
| --- | --- |
| Critique | 3 |
| Haute | 9 |
| Moyenne | 11 |
| Basse | 6 |
| **Total** | **29** |

---

## CRITIQUE

### C1. « Règle versionnée » : on ne sait pas si c'est de la donnée ou du code, ni où elle vit
- **Où :** FR-10 ; AD-5 et AD-8 (architecture) ; `decisions-finances.md`, dernier point « À trancher ».
- **Citation :** « centralisées dans un mécanisme **versionné** … valeur ou paramètres de calcul … conditions d'application … tests associés » ; architecture : « `parameters` : `key`, `value`, `unit`, `source`, `verified_on`, `revalidate_after` ».
- **Pourquoi c'est bloquant :**
  - Le prorata de première année, la bascule de TVA et la fin de l'ACRE sont des **formules**, pas des valeurs. Une table de lignes ne les exprime pas. Les « conditions d'application » et les « tests associés » ne sont pas non plus de la donnée. AD-5 dit que les paramètres entrent en argument de fonctions pures : le code porte donc la logique et la table seulement les valeurs. Le PRD laisse croire à un moteur de règles entièrement piloté par les données.
  - La question « `parameters` étendue ou table de règles à part ? » est ouverte dans `decisions-finances.md`. Elle **n'apparaît pas dans §9**. L'architecture ne peut pas démarrer sans réponse, et rien ne la trace côté PRD.
  - Une règle est-elle propre à un propriétaire (RLS `owner_id`, règle de CLAUDE.md) ou partagée ? Les comptes de démonstration A et B ont-ils chacun leurs règles ? Rien n'est dit.
  - « Versionné » n'est pas défini : une modification crée-t-elle une nouvelle version avec date d'effet, ou écrase-t-elle la ligne ? Les deux sont écrits : « une modification d'une règle est prise en compte au calcul suivant, sans cache » et « une règle historique n'est jamais présentée comme actuelle ». Une écrasée ne permet pas de recalculer une période passée avec la règle en vigueur à l'époque.
- **Correction suggérée :** ajouter en §9 une question « modèle des règles ». Écrire dans FR-10 : (a) une règle = enregistrement de données + fonction pure identifiée par `rule_id` ; (b) une modification crée une nouvelle version (jamais d'écrasement) ; (c) pour un calcul à une date D, on prend la version dont D est dans [début, fin] ; (d) portée par propriétaire (conforme à CLAUDE.md) avec jeu de règles de démonstration étiqueté fictif. Faire trancher par `bmad-architecture` avant la story 4.1.

### C2. Le compte de démonstration et le compte réel afficheront « paramètre manquant » partout sur la finance
- **Où :** UJ-5, FR-10, FR-11, FR-25, §9 point 5, §12 ; story 7.1 / 7.4 des epics.
- **Citation :** « la date de début d'activité est “À confirmer” » ; « Aucune valeur n'est préremplie » ; « le prorata de la première année, la fin de l'ACRE et la règle 4 affichent “paramètre manquant” ».
- **Pourquoi :**
  - Compte réel : l'auteur n'a pas de date d'immatriculation. Toute jauge dont la règle dépend de cette date reste vide jusqu'à l'immatriculation. Le cœur de l'epic 4 n'est alors **jamais démontrable** avant le 8 février 2027.
  - Compte de démo : un compte neuf a un profil entièrement « À confirmer » et aucune règle. SM-6 et la story 7.4 (parcours de démo) ne peuvent pas montrer une jauge ou une estimation sans règles ni profil fictifs. Le PRD dit « données fictives étiquetées » (FR-2) mais interdit toute valeur préremplie : contradiction non résolue.
  - Le PRD ne précise pas si un plafond de base (non prorata) est calculé quand seul le prorata est inconnu.
- **Correction suggérée :** décider explicitement : (1) un jeu de règles et un profil de démonstration, chaque valeur étiquetée « fictif, pas une règle » et rattachée au seul compte démo ; (2) une jauge peut afficher le seuil de base et dire « prorata non calculable : date de début à confirmer », au lieu de tout masquer, à condition que la règle de base soit vérifiée. Ajouter un cas limite à UJ-5 et un critère à FR-2.

### C3. « Tâche » désigne quatre choses, et le calendrier de FR-13 recouvre le cockpit de FR-14
- **Où :** glossaire (Tâche), FR-8, FR-13 (calendrier), FR-14, FR-21.
- **Citation :** glossaire : « Tâche — action concrète d'une user story » ; FR-13 : « Chaque tâche porte titre, description, date d'échéance, catégorie, statut, priorité, lien vers la source… règle de récurrence » ; FR-14 : « Ces sept règles sont les seules ».
- **Pourquoi :**
  - Tâche de story, tâche de calendrier, tâche du jour calculée par une règle, tâche du sprint affichée au cockpit : quatre objets. FR-13 les mélange.
  - FR-13 donne à chaque tâche de calendrier un champ **priorité** et un **statut**, alors que FR-14 définit l'ordre par les règles 1 à 7 et l'architecture (AD-5) calcule les tâches du jour **à la lecture** en ne stockant que `task_checks`. Deux systèmes de priorité, deux sources de vérité.
  - La vue « Aujourd'hui » du calendrier et le cockpit « Aujourd'hui » sont-ils le même écran ? Une échéance à J-3 est-elle une tâche de calendrier, une tâche du jour de la règle 1, ou les deux (doublon) ? Idem pour « factures à relancer » (catégorie du calendrier) et règle 2 (facture échue).
  - La « récurrence » implique de générer des occurrences, ce qui contredit « calculé à la lecture, seul le fait de cocher est stocké ».
  - La liste de FR-14 « sont les seules » contredit l'existence d'autres rappels : « rappel de revérification périodique » de FR-13 (voir H4), vues « En retard ».
- **Correction suggérée :** renommer côté finance « échéance » (FR-13) et réserver « tâche du jour » à FR-14 ; ajouter au glossaire « Échéance du calendrier » et « Tâche du jour ». Dire que le calendrier est une **liste d'échéances** dont certaines alimentent la règle 1 ; supprimer le champ « priorité » ou dire qu'il n'influence pas l'ordre du cockpit ; dire comment la récurrence est stockée (règle ou occurrences). Écrire une règle de déduplication (une facture échue = une seule ligne).

---

## HAUTE

### H1. Contradiction interne : UJ-4 dit que le lien backlog/cockpit « n'est pas encore décidé », §9 point 6 dit « tranché »
- **Où :** UJ-4 ; §9 point 6 ; FR-14.
- **Citation :** UJ-4 : « le lien entre le backlog et le cockpit n'est pas encore décidé : §9, point 6 » ; §9.6 : « ~~Lien…~~ : tranché le 17 octobre ».
- **Pourquoi :** le renvoi pointe vers un point clos. Un lecteur croit qu'une décision manque. Le journal (`docs/journal.md`, lignes 500 à 524) confirme que c'est tranché.
- **Correction :** retirer la parenthèse dans UJ-4 et renvoyer vers FR-14, règle 7. Faire passer en revue tous les renvois « §9 point N » : les points 5, 7, 8, 11, 12, 13, 14 sont bien cités ; le 9 (devis accepté) et le 10 (ARE) ne sont référencés par aucune FR (FR-22 et FR-28 devraient les citer).

### H2. « Fin de l'ACRE, date saisie » (règle 4) contredit « fin de l'ACRE dépend de la date d'immatriculation » (§9.5, UJ-5)
- **Où :** FR-14 règle 4 ; §9 point 5 ; FR-25 ; glossaire.
- **Citation :** « (4) fin de l'ACRE à M-1, date saisie » ; « la fin de l'ACRE et la règle 4 affichent “paramètre manquant” tant qu'elle [la date d'immatriculation] n'est pas saisie » ; FR-11 : « fin de l'ACRE » comme règle à écrire avec source.
- **Pourquoi :** la date de fin d'ACRE est-elle **saisie** par l'auteur ou **calculée** (début + durée de la règle) ? Les deux textes s'excluent. Autre trou : si le profil dit « non éligible à l'ACRE », la règle 4 est sans objet, pas « paramètre manquant » (FR-25 prévoit « éligibilité éventuelle »). Les états « inapplicable » et « À confirmer » ne sont pas distingués.
- **Correction :** trancher « calculée par la règle versionnée à partir de la date de début ». Ajouter un troisième état explicite « non applicable » à côté de « À confirmer ». Le tester dans les critères de la 5.3.

### H3. Règle 3 (90 %) contre FR-11 (plusieurs plafonds, alertes 50/75/90/100)
- **Où :** FR-14 règle 3 ; FR-11 ; §9 point 13 ; FR-15 ; UX-DR4 et story 4.4 (marqueur à 90 %).
- **Citation :** « (3) encaissements cumulés à 90 % d'un plafond suivi (FR-11 ; … §9, point 13) » ; FR-11 : « Des alertes sont configurables à 50, 75, 90 et 100 % ».
- **Pourquoi :**
  - La règle 3 reste écrite pour 90 % alors que le PRD annonce quatre seuils configurables. Si seul 90 % déclenche une tâche, que fait « alerte à 50 % » ? Où s'affiche-t-elle ? Il n'existe **aucun canal de notification au MVP** : n8n, e-mails et rappels sont après le MVP, et FR-14 interdit les envois. La « préférence de notification » du profil (FR-25) n'a donc aucun consommateur.
  - « Configurables » est ambigu : activer/désactiver parmi quatre valeurs figées, ou saisir ses propres pourcentages ?
  - « d'un plafond suivi » : un plafond ou chacun ? Une tâche par plafond ? Si 3 plafonds franchissent 90 % le même jour, trois tâches identiques ?
  - FR-15 et la story 5.5 parlent encore de « la position par rapport au plafond » au singulier : laquelle montre-t-on sur le cockpit ?
- **Correction :** décider (et l'écrire dans FR-11/FR-14) : les alertes sont visuelles sur la jauge (paliers franchis) ; la règle 3 génère une tâche par plafond dont le palier **choisi** est franchi ; palier par défaut = décision de l'auteur, non codé en dur (réglage dans le profil). Supprimer « préférences de notification » du profil MVP ou nommer son usage.

### H4. « Jamais de fausse échéance » contredit « une échéance sans date est refusée »
- **Où :** FR-13.
- **Citation :** « une échéance sans date ou sans source est refusée à la saisie » ; « une échéance inconnue est signalée comme telle (“À confirmer”), pas estimée silencieusement ».
- **Pourquoi :** pour signaler une échéance inconnue il faut pouvoir la représenter sans date. La contrainte `not null` de l'architecture (AD-4 : « échéance sans date refusée ») l'interdit. De plus, pour les échéances **calculées** par une règle vérifiée, la « source » est celle de la règle, pas une saisie ; et pour les échéances personnalisées, la « source officielle » n'a pas de sens. L'enum « source d'une échéance » (AD-8) n'est pas défini pour ces cas.
- **Correction :** distinguer échéance saisie (date et source obligatoires), échéance calculée (date issue d'une règle ; si la règle ou le profil est « À confirmer », une ligne « À confirmer » sans date, hors tâches du jour), échéance personnalisée (source = « moi »). Mettre à jour la contrainte de base en conséquence.

### H5. Rappel de revérification périodique : sans écran ni règle pour l'afficher
- **Où :** FR-13 (« chaque règle et chaque paramètre porte un rappel de revérification périodique ») ; FR-10 ; FR-14.
- **Pourquoi :** FR-14 dit que les sept règles sont « les seules » : le rappel ne peut donc pas être une tâche du cockpit. S'il est seulement signalé sur la page de paramètres (story 4.1), il n'existe pas comme rappel (personne n'ouvre la page). La périodicité n'est pas définie non plus (champ `revalidate_after` d'AD-8, absent du modèle FR-10). Aucun e-mail au MVP.
- **Correction :** soit un bandeau sur le cockpit « N règles à revérifier » (comme la ligne de synthèse de FR-21, hors liste des tâches), soit une huitième règle assumée. Ajouter `revalidate_after` à la liste des champs d'une règle (FR-10) puisque FR-13 en dépend.

### H6. La règle 7 et les « tâches du sprint » : ordre, volume et statut non définis
- **Où :** FR-14 ; §10.
- **Citation :** « la règle 7 et les tâches du sprint passent **après** les six premières » puis `[ASSUMPTION : la règle 7 passe avant les tâches du sprint]`.
- **Pourquoi :**
  - Le texte **ordonne** déjà (règle 7 avant les tâches du sprint, toutes après 1 à 6) et marque cet ordre « hypothèse » : formulation incohérente. Qui décide ?
  - Volume : « les tâches non faites des stories “en cours” du sprint actif » apparaissent **chaque jour**, sans plafond. Un sprint de 8 stories de 8 tâches noie la liste, ce qui heurte SM-C1 (« ne pas gonfler la liste ») et le message de félicitation (« quand tout est fait »). Rien ne permet d'atteindre la félicitation si le sprint a 40 tâches.
  - Cocher une tâche de sprint au cockpit : modifie-t-on `tasks.done` (donnée métier) ou écrit-on `task_checks` (AD-5, clé « règle, entité source, date ») ? Le glossaire dit que cocher toutes les tâches ne change pas le statut de la story ; mais le cas « cocher au cockpit, décocher dans la mission » est indéfini.
  - Le cockpit lit alors des tables de missions : cela étend FR-14 « calculées à partir de données saisies » mais ouvre une dépendance epic 5 → epic 3 non listée dans le plan des sprints.
  - `decisions-finances.md` classe encore « Septième règle du cockpit … » dans « À trancher », alors que le PRD la déclare décidée le 17 octobre (journal, ligne 500, le confirme). Mettre le journal de décisions en cohérence.
- **Correction :** plafonner (par exemple 3 tâches de sprint à la fois, par priorité de story) ou n'afficher que les tâches de la première story en cours ; dire que cocher écrit `tasks.done` ; supprimer l'oscillation « après/avant ». Chiffres de plafond = choix de l'auteur, à marquer `[ASSUMPTION]` s'ils sont proposés.

### H7. Le plafond « cumul revenus / allocations chômage » a été sorti du module 6 sans décision tracée
- **Où :** FR-11 ; glossaire Plafond ; spec module 6 ; `decisions-finances.md` décision 3.
- **Citation :** FR-11 : « (le cumul avec les allocations chômage relève de la phase suivante, FR-28) » ; spec : « Plafonds du régime micro / franchise de TVA / seuils TVA / seuils internes / Limites éventuelles liées au cumul revenus / allocations chômage ».
- **Pourquoi :** la décision de l'auteur est « module 6 entier dans le MVP, modules A, B et 8 après ». Le PRD **scinde** le module 6 : c'est une coupe inventée, non consignée. Le calendrier compte une catégorie « Actualisation France Travail » et un champ de profil « Situation France Travail » au MVP, sans le suivi ARE qui leur donne un sens.
- **Correction :** soit réintégrer la limite de cumul dans FR-11 au MVP (jauge « paramètre manquant » tant que la règle manque), soit demander à l'auteur de confirmer la coupe et l'inscrire dans `decisions-finances.md` et §9.10.

### H8. FR-9 : le schéma des factures et des encaissements dépend de règles qui ne sont pas encore écrites
- **Où :** FR-9 ; §9 point 11 ; stories 4.2 et 4.3 (sprint 9).
- **Citation :** « les factures et les encaissements portent les champs que ces règles exigent, fixés quand les règles sont écrites ».
- **Pourquoi :** les migrations sont versionnées et les stories 4.2/4.3 (sprint 9) précèdent 4.4/4.5. Si le HT/TTC, la catégorie de recettes ou la date d'exigibilité manquent, une seconde migration sur des données déjà saisies sera nécessaire. Le glossaire affirme en outre « Encaissement … base de tous les calculs de cotisations et de plafond », ce que FR-11 contredit (« la base que sa règle désigne … pas le même montant »). Une règle de TVA sur facturation (exigibilité) ne s'appuie pas forcément sur l'encaissement.
- **Correction :** figer un schéma minimal de précaution (montant HT, montant de TVA, taux, catégorie de recette, date de facture, date d'encaissement) marqué `[ASSUMPTION]`, ou ajouter la dépendance « §9.11 résolu » dans le plan des sprints avant la 4.2. Corriger le glossaire.

### H9. Dépendances amont sans propriétaire ni date : l'epic 4 peut rester bloqué
- **Où :** FR-11 « Prérequis » ; §9 points 5, 11, 12, 14 ; §7.1.
- **Pourquoi :** les règles, leurs sources et les 6 cas de référence doivent être **écrits par l'auteur** avant l'implémentation. C'est du travail de recherche (Légifrance, Urssaf, Impots.gouv) qui bloque le sprint 9 à 10. Le PRD ne donne ni échéance, ni volume (combien de règles ? 5 ? 20 ?), ni estimation en heures, et le §7.1 assume « non chiffré ». « Aucune coupe pour l'instant » (§7.3) n'est donc pas démontré : environ 195 h restantes à répartir sur 17 semaines à 35 h/semaine (soit 595 h de capacité) donne une marge, mais elle ne couvre pas un périmètre qui n'a pas été estimé, ni le temps de l'auteur pour documenter les règles. Les cas de référence contiennent aussi les mots « 3 cas limites » alors que le point d'entrée de chacun (date d'immatriculation) est inconnu.
- **Correction :** lister les règles minimales à écrire (inventaire, pas valeurs) : plafond micro BNC, franchise de TVA (seuil de base et seuil majoré), taux de cotisation BNC, ACRE, prorata, fréquence de déclaration, calendrier Urssaf/impôt/CFE. Y associer une date butoir (avant le début du sprint 9) et un repli : si une règle manque à la date, la story livre l'écran « paramètre manquant » et le test de la règle devient une dette tracée.

---

## MOYENNE

### M1. FR-10 : « statut de validation » et « périmée » ne sont pas définis
Les valeurs `à vérifier / vérifiée / périmée` (FR-10) ne figurent pas dans la spec, qui dit seulement « statut de validation » : valeurs inventées. « Périmée » est-elle une saisie, ou calculée à partir de la date de fin d'effet ou de `revalidate_after` ? « Vérifiée par qui » : l'auteur seul, sans contrôle ? Testabilité faible. Définir : `verified` posé à la main avec date ; `périmée` calculée.

### M2. « Tests associés » est un champ de donnée ou des tests de code ?
FR-10 range les « tests associés » parmi les champs de la règle ; FR-11 en fait les cas de référence ; AD-5 dit « tests unitaires Vitest ». Une base ne contient pas de tests exécutables. Dire que le champ est une **référence** (identifiants de cas de référence) et que l'exécution est dans le code. Sinon la story 4.1 cherchera à stocker du code.

### M3. « Demande une intervention humaine » : exigence inventée et sans destinataire
FR-11 : « le système … affiche “paramètre manquant” et demande une intervention humaine ». Absent de la spec. Dans une application mono-utilisateur, qui est l'humain, et par quel canal ? Supprimer ou remplacer par « renvoie vers la page Paramètres ou Profil ».

### M4. Les états du profil : « À confirmer », « déclaré par l'auteur, à confirmer à la source », « confirmé »
FR-25 précise que le statut « micro-entreprise, BNC » est prérempli au démarrage mais « marqué à confirmer ». C'est un prérempli, que la même FR interdit (« jamais préremplie »). Il y a ici au moins 4 états (À confirmer / déclaré non vérifié / confirmé / non applicable). Définir le jeu d'états et dire lesquels autorisent un calcul. (Probablement : seul « confirmé » autorise un calcul, et le statut de l'auteur ne le sera qu'après vérification, ce qui renvoie à C2.)

### M5. Chaque FR qui dépend du profil n'a pas de conséquence « À confirmer » explicite
Seules FR-10, FR-11, FR-14 et UJ-5 mentionnent l'état. Les autres dépendances sont silencieuses :
- **FR-13 (calendrier)** : fréquence Urssaf, régime de TVA, début d'activité, statut conditionnent les dates calculées ; le comportement « À confirmer » n'est écrit qu'en général (voir H4).
- **FR-9** : champs exigés par les règles (H8) ; que dit le formulaire de facture si la catégorie d'activité est « À confirmer » ?
- **FR-12 / assistant** : demande d'explication d'une estimation dont l'entrée est « À confirmer » ; que répond-il (il ne doit rien calculer) ? Et AD-7 limite ses données aux notes et aux résultats de `lib/domain/` : le profil (situation France Travail, statut) est une donnée personnelle potentiellement envoyée à Anthropic ; non listée en §5.2 (RGPD).
- **FR-15 / story 5.5** : un plafond « paramètre manquant » masque-t-il tout le bloc ?
- **FR-14** : règles 1 (échéances calculées), 3, 4 ; la règle 7 et les règles 2, 5, 6 n'en dépendent pas : le dire pour que « une règle dont … est À confirmer » ne soit pas lu comme valable pour les sept.
- **UJ-1** : un seul cas limite sur la jauge ; pas de cas « échéance à confirmer ».
Ajouter un tableau « FR × donnée du profil × comportement si À confirmer / non applicable » en §4.4.

### M6. Aucun test d'acceptation du profil (FR-25) ni de SM associé
FR-25 liste 12 champs sans type (enum ? libre ?), sans valeurs admises ni critères testables. Plusieurs champs n'ont **aucun consommateur au MVP** : « taux de réserve personnels », « préférences de notification », « objectifs financiers » (consommés en FR-27 seulement), « nature des prestations ». Ajouter un tableau champ → type → qui le lit au MVP, et retirer ou différer ceux sans usage. Aucun indicateur de réussite (§8) ne couvre FR-25 ni FR-10 hormis SM-1.

### M7. Le calendrier de FR-13 empiète sur les non-objectifs
§6 exclut « agenda complet » ; FR-13 spécifie dix catégories, quatre vues (Aujourd'hui, Cette semaine, Ce mois-ci, En retard), des récurrences. Les catégories « factures à émettre » et « justificatifs à transmettre » n'ont ni entité ni FR de support (pas de facturation, §6). Dire ce qu'on livre au MVP : liste d'échéances filtrable avec catégorie. Les vues « Cette semaine » et « Ce mois-ci » sont de simples filtres et peuvent être gardées ; les récurrences et « factures à émettre » devraient être reportées ou explicitement acceptées.

### M8. Le conflit apparent avec §6 sur la TVA
§6 : « calcul officiel … de TVA » exclu ; estimations permises (« cotisations au MVP ; impôt sur le revenu et TVA en phase suivante, FR-26 »). Mais FR-11 (MVP) suit les seuils de franchise de TVA, des « seuils de TVA applicables » et exige un cas limite « bascule de TVA ». Il est cohérent de suivre un **seuil** au MVP et de provisionner la TVA plus tard, mais il faut le dire. Surtout, une bascule de TVA affichée « vous devez facturer la TVA » est une obligation légale énoncée : la règle « aucun conseil fiscal » impose un libellé du type « seuil atteint selon la règle X (source, vérifiée le) ; à confirmer auprès de l'administration », à ajouter dans les critères de la jauge.

### M9. Le « point d'entrée central » voulu par la spec a disparu
La spec indique que le cockpit financier « doit devenir le point d'entrée central de l'application ». Le PRD garde « Aujourd'hui » comme cockpit et repousse la vue d'ensemble (module A) en phase suivante, avec FR-15 : « L'affichage financier n'est pas un critère de réussite de l'outil ». C'est probablement la bonne coupe, mais l'écart avec l'intention de la spec n'est ni nommé ni confirmé. À consigner dans `decisions-finances.md`. FR-15 (CA encaissé, position) recoupe aussi les premiers indicateurs de FR-26 : préciser ce qui est fait en MVP et ce qui est repris.

### M10. Anomalies de numérotation et de références
- §0 : « numérotées de façon continue » alors que FR-19 à FR-28 sont placés hors ordre (acceptable car annoncé) ; mais **FR-25 apparaît avant FR-13** et FR-26 à 28 en §4.9 : la table de couverture des epics doit suivre.
- NFR-2 dit « UJ-1 à UJ-6 » ; `epics.md` (NFR-2) et §8 disent « UJ-1 à UJ-5 ».
- §7.2 : le jalon du 30 octobre inclut FR-19, qui couvre « notes, clients, missions » alors que clients et missions arrivent après (story 3.7). À scinder (FR-19 notes seulement au jalon).
- §10 index des hypothèses : 4 entrées, mais la première occurrence de FR-14 y est comptée alors que le texte contient une phrase d'ordre contradictoire (H6) ; aucune entrée pour « statut BNC préenregistré » en tant que valeur par défaut.
- Nom des paramètres : glossaire « Paramètre » et FR-10 « règle » coexistent ; CLAUDE.md et epics emploient encore « table de paramètres ».

### M11. Statut `final` alors que 14 questions restent ouvertes dont 8 créées aujourd'hui
Front-matter `status: final`, mais §9.7 à 9.14 sont ouvertes et trois au moins bloquent des stories (9.7 règle 5, 9.8 règle 6, 9.13 règle 3). Le log de décisions classe 4 sujets en « À trancher ». Passer en `draft` ou `final-with-open-questions` et ajouter pour chaque question ouverte la story qu'elle bloque.

---

## BASSE

- **L1.** FR-14 règle 1 « à J-3 » et règle 2 « à J+1 » : exactement ce jour-là, ou à partir de ce jour jusqu'à clôture ? Une échéance à J-1, J0 ou en retard disparaît-elle du cockpit ? Écrire « à partir de J-3 jusqu'à la clôture » (comportement attendu par UJ-1) pour la testabilité.
- **L2.** Les valeurs « J-3, 7 jours, J-2, 90 %, M-1, 8 stories, 30 000 caractères » sont du paramétrage produit et non réglementaire : le dire (ou les placer dans un réglage) évite qu'un lecteur y voie des « valeurs en dur » au sens de la contrainte transverse.
- **L3.** FR-27 propose 2 000, 3 000, 5 000 € : valeurs produit de la spec, non réglementaires ; OK, mais à marquer comme telles pour que l'auditeur de la contrainte « aucune valeur en dur » ne les signale pas.
- **L4.** `CLAUDE.md` n'a pas suivi : « table de paramètres », « Cockpit étendu par ordre de priorité … provision et dépenses en second temps », plan 130 h, MVP sans calendrier ni profil. Un agent qui lit CLAUDE.md implémentera la version ancienne. Mettre à jour (ligne périmètre et règle des paramètres) ; c'est le fichier chargé automatiquement.
- **L5.** `epics.md` est périmé et contredit désormais le PRD sur de nombreux points (à lister pour la suite BMAD, pas à corriger ici) :
  - **Inventaire** : « FR-10 : table de paramètres », « FR-14 : six règles », FR-25 à FR-28 absents de l'inventaire et de la carte de couverture ; FR-13 sans calendrier.
  - **3.6** : « accepté (la mission liée est créée ou confirmée) » : indéterminé (§9.9) ; la story ne dit pas ce que fait un devis accepté sur un prospect.
  - **4.1** : un paramètre = valeur + source + date ; manquent version, date d'effet/fin, conditions, catégorie d'activité, statut, tests, et la page Profil (FR-25) n'a pas de story.
  - **4.4** : « un paramètre “plafond” » unique et un marqueur fixe à 90 % ; ni plusieurs plafonds, ni période, ni base de calcul, ni alertes 50/75/90/100, ni source/date d'effet affichées.
  - **4.5** : « un taux de cotisation en paramètre » et « 6 cas de référence » sans lien avec les règles versionnées ni avec les trois états de FR-25.
  - **5.1** : échéance = titre, date, source ; pas de catégorie, récurrence, vues, « À confirmer ».
  - **5.2 à 5.4** : règles 1 à 6 seulement ; **5.3** parle de « date de fin d'ACRE » comme paramètre ; **5.4** mélange « devis ou prospect » alors que le critère ne teste que les devis (§9.7) ; aucune story pour la règle 7 ni pour « Client / Mission / Sprint X ».
  - **5.5** : « un plafond » au singulier.
  - **Plan des sprints** : le sprint 9 enchaîne 4.1, 4.2, 4.3 sans la dépendance aux règles écrites (H8, H9) ; le sprint 10 charge 4.4, 4.5, 8.12 et 5.1 : trop dense si le calendrier de FR-13 est ajouté.
  - **AD-5** : « six règles » ; **AD-8** : `parameters` sans version, sans propriétaire clair, pas de table profil, pas de table de règles ; `deadlines` à étendre (catégorie, récurrence, source calculée).
- **L6.** FR-10 : « les données du propriétaire, les règles, les résultats de calculs, les notifications et les sources sont des notions séparées » est un principe d'architecture, pas une exigence testable ; et « notifications » n'a aucune FR au MVP. Déplacer vers l'architecture.

---

## Éléments inventés (non décidés par l'auteur) à valider

| Élément | Où | Source |
| --- | --- | --- |
| Valeurs du statut de validation « à vérifier, vérifiée, périmée » | FR-10 | non dans la spec |
| « demande une intervention humaine » | FR-11 | non dans la spec |
| Sortie du plafond « cumul allocations » du MVP | FR-11 | contraire à la décision 3 de `decisions-finances.md` |
| Ordre « règle 7 avant les tâches du sprint » | FR-14 | signalée `[ASSUMPTION]`, bien |
| Affichage permanent des tâches du sprint actif sans plafond | FR-14 | décision du 17 octobre mentionnée dans le journal, mais sans limite de volume |
| Rappel de revérification par règle | FR-13 | repris d'une ancienne version, sans canal |
| Jauge : « date d'effet de la règle » comme champ affiché | FR-11 | spec, OK |

## Ce qui est bien (à ne pas casser)
- La contrainte transverse est reprise mot pour mot dans §4.4, §5.2 et le glossaire.
- Aucune valeur fiscale n'est écrite dans le PRD.
- Les hypothèses sont étiquetées et indexées ; §9 trace les 8 nouvelles questions.
- Les modules A, B et 8 sont bien reportés en phase suivante avec des conséquences testables (FR-26 à FR-28), conformes à la spec.

## Ordre de correction recommandé
1. C1 (modèle des règles) et C2 (démo et compte réel) : à trancher avec l'auteur et `bmad-architecture`.
2. C3, H3, H4, H5 : un paragraphe de vocabulaire et de comportement du calendrier et des alertes.
3. H1, H2, H6, H7 : corrections ponctuelles dans le PRD.
4. H8, H9 : schéma minimal des factures et inventaire des règles à écrire, avec échéance.
5. Mettre à jour `decisions-finances.md`, `CLAUDE.md`, puis `epics.md` (stories 3.6, 4.x, 5.x, plan des sprints).
