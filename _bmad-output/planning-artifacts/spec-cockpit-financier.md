> **Source :** spec rédigée par l'auteur avec l'aide de Claude (conversation externe), versée au dépôt le 18 octobre 2026. Le document saute de « Module B » à « Module 6 » : les modules 1 à 5 n'existent pas dans ce texte. **Statut dans LogMerry :** les modules 6, 7, 9 et 10 entrent dans le MVP (epics 4 et 5) ; les modules A, B et 8 sont une phase suivante. Voir `decisions-finances.md`.

# Spec — Cockpit financier (complément WS8)

**Contexte pour Claude Code :** cette spec complète le projet mini-CRM + cockpit d'activité du Workshop 8 (gestion clients, missions, factures, échéances). Elle porte spécifiquement sur le module cockpit financier, qui doit devenir le point d'entrée central de l'application.

**Contrainte transverse non négociable — à respecter dans tous les modules ci-dessous :**
Aucune valeur réglementaire (plafond, taux, abattement, seuil, échéance) ne doit être codée en dur sans source officielle identifiée, datée et vérifiée. Les règles 2026 doivent être vérifiées avant intégration — ne jamais présenter une règle historique comme une règle actuelle. Une règle non vérifiée ne doit jamais produire un calcul présenté comme fiable. Une donnée personnelle inconnue ne doit jamais être préremplie avec une valeur arbitraire : utiliser un état « À confirmer ».

Sources officielles à utiliser en priorité :
- Légifrance — https://www.legifrance.gouv.fr/
- Entreprendre.Service-Public.fr — https://entreprendre.service-public.gouv.fr/
- Urssaf — https://www.urssaf.fr/
- Impots.gouv.fr — https://www.impots.gouv.fr/
- France Travail — https://www.francetravail.fr/

---

## Module A — Vue d'ensemble du cockpit

Afficher les indicateurs suivants, calculés à partir des données réellement enregistrées (jamais de valeur fictive) :

- Chiffre d'affaires encaissé ce mois-ci
- Chiffre d'affaires facturé mais non encaissé
- Chiffre d'affaires cumulé depuis le début de l'année
- Objectif de chiffre d'affaires mensuel
- Prévision de chiffre d'affaires à 3, 6 et 12 mois
- Dépenses professionnelles enregistrées
- Cotisations sociales estimées
- Impôt sur le revenu estimé
- TVA à provisionner ou à reverser, lorsque le régime applicable le nécessite
- Trésorerie disponible
- Réserves recommandées
- Revenu personnel estimé après provisions

**Exigences :**
- Chaque indicateur doit être explicable : l'utilisateur peut consulter le calcul, les hypothèses retenues et les éléments restant à payer.
- Ne jamais présenter le chiffre d'affaires comme équivalent au revenu net.

---

## Module B — Objectifs et progression

- Permettre de définir un objectif mensuel de CA.
- Proposer des objectifs prédéfinis (2 000 €, 3 000 €, 5 000 €) + saisie libre d'un montant personnalisé.
- Afficher : progression mensuelle, écart objectif/résultat, nombre de jours facturés, TJM moyen réalisé, CA nécessaire pour atteindre l'objectif, projection basée sur les données disponibles.
- Distinguer clairement les prévisions des données réelles (étiquetage visuel différent).
- Si les données sont insuffisantes pour une projection fiable, afficher explicitement : « Données insuffisantes pour établir une prévision fiable. »

---

## Module 6 — Suivi des plafonds réglementaires

Section dédiée aux seuils, distinguant clairement :
- Plafonds du régime micro
- Seuils de franchise de TVA
- Seuils de TVA applicables au régime de l'utilisateur
- Seuils internes choisis pour les alertes
- Limites éventuelles liées au cumul revenus / allocations chômage

Chaque jauge doit afficher : seuil concerné, montant consommé, pourcentage atteint, montant restant avant le seuil, période de référence, date de dernière mise à jour, source officielle, date d'effet de la règle.

Prévoir des alertes configurables à 50 %, 75 %, 90 % et 100 %.

**Important :** les seuils se calculent chacun à partir du CA pertinent pour la règle concernée — ne pas réutiliser automatiquement le même montant pour tous les plafonds, les règles pouvant porter sur des périodes, catégories de recettes ou bases différentes.

---

## Module 7 — Calendrier administratif

Calendrier centralisé des obligations, catégories :
- Déclarations Urssaf
- Actualisation France Travail
- Déclarations fiscales
- Déclarations de TVA
- CFE et échéances associées
- Factures à émettre
- Factures à relancer
- Justificatifs à transmettre
- Renouvellements et démarches administratives
- Échéances personnalisées

Chaque tâche : titre, description, date d'échéance, catégorie, statut, priorité, lien vers la source officielle, règle de récurrence éventuelle.

Vues à prévoir : « Aujourd'hui », « Cette semaine », « Ce mois-ci », « En retard ».

**Important :** ne jamais générer de fausse échéance administrative. Les dates sont calculées à partir des règles applicables au profil, ou saisies par l'utilisateur. Une échéance inconnue doit être signalée comme telle, pas estimée silencieusement.

---

## Module 8 — Suivi ARE (maintien des allocations chômage)

Module clé pour un utilisateur qui crée son activité après une période de chômage.

**Données à enregistrer :**
- Date de début d'indemnisation
- Montant journalier de l'ARE
- Montant mensuel de référence
- Nombre de jours de droits restants
- Date de fin estimée des droits
- Date de création de l'entreprise
- Catégorie de l'activité
- Revenus déclarés par période
- Justificatifs demandés / transmis
- Montants effectivement versés par France Travail

**Fonctionnalité :** estimation mensuelle du complément ARE, avec détail du calcul affiché.

**Exigences impératives :**
- Ne pas supposer que le calcul de l'ARE suit une formule universelle : le résultat dépend de la réglementation applicable aux droits de l'utilisateur, de sa situation et des revenus retenus par France Travail.
- Identifier les règles applicables selon les dates et conditions d'éligibilité.
- Distinguer les droits ouverts avant et après les changements réglementaires pertinents.
- Enregistrer les paramètres de calcul avec leur date d'effet.
- Afficher les hypothèses utilisées.
- Distinguer clairement le montant estimé du montant officiellement notifié.
- Avertir quand des données indispensables manquent.
- Permettre la saisie du montant réellement versé, pour comparer prévision et réalité.
- Ne jamais garantir un montant d'ARE, ni présenter une simulation comme une décision administrative.
- Documenter la différence entre maintien de l'ARE et ARCE, sans mélanger les deux dispositifs.

---

## Module 9 — Architecture des règles réglementaires

Les règles fiscales, sociales et administratives ne doivent pas être dispersées dans les composants d'interface : centraliser dans un mécanisme versionné.

Chaque règle comporte au minimum : identifiant, catégorie, description, valeur ou paramètres de calcul, date de début d'effet, date de fin d'effet éventuelle, conditions d'application, catégorie d'activité concernée, source officielle, date de dernière vérification, statut de validation, tests associés.

Une règle non vérifiée ne doit jamais être utilisée silencieusement pour produire un calcul présenté comme fiable.

**Séparer clairement :** données utilisateur / règles réglementaires / résultats de calculs / notifications / sources et justificatifs.

---

## Module 10 — Paramètres du profil professionnel

Page de configuration permettant de renseigner :
- Statut juridique
- Régime fiscal
- Catégorie BNC ou BIC, le cas échéant
- Nature des prestations
- Date de début d'activité
- Fréquence des déclarations Urssaf
- Régime de TVA
- Éligibilité éventuelle à l'ACRE
- Situation France Travail
- Objectifs financiers
- Taux de réserve personnels
- Préférences de notification

**Important :** ne jamais préremplir une donnée personnelle inconnue avec une valeur arbitraire — utiliser un état « À confirmer ».
