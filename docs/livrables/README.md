# Livrables de la soutenance du 16 novembre 2026

Liste donnée par Alex le 4 novembre 2026 ; objectif : **prêts vendredi 6 novembre au matin** (rendez-vous avec son tuteur). Leur origine exacte (école, Workshop 8) n'est pas précisée et ils n'ont pas de lien avec le numéro RNCP : ne rien supposer sur les critères de notation, les confirmer avec le tuteur.

Règle : rien d'inventé. Ce qui est dans ces documents vient du code, des migrations, des tests et des documents du projet ; ce qui est inconnu est écrit « À confirmer ».

Le PDF d'ensemble se génère avec `npm run livrables` (Chrome sans interface, aucun service externe) : couverture, sommaire avec numéros de page, un chapitre par fichier `NN-*.md`. Résultat : `livrables-soutenance.pdf`.

Légende de la colonne « Reste » : **moi** = je rédige à partir du dépôt ; **toi** = Alex doit fournir ou décider ; **les deux**.

| N° | Livrable | Ce qui existe déjà (vérifié dans le dépôt) | Fichier prévu | Reste |
|---|---|---|---|---|
| 1 | Schéma de données (MCD) + dictionnaire + règles d'intégrité | `supabase/migrations/` (une trentaine de fichiers), `lib/supabase/database.types.ts`, modèle dans `ARCHITECTURE-SPINE.md`. Aucun diagramme. | `01-schema-de-donnees.md` (Mermaid ER, dictionnaire, contraintes, RLS) | **fait** (relu dans la base) |
| 2 | Workflow de saisie des documents et gestion IA / RAG | Code : saisie de note, indexation Mistral, chat, vérification des citations, historique ; `docs/rag-tests.md` | `02-workflows.md` (diagrammes Mermaid : états, événements, règles, exceptions, SLA) | moi ; **toi** : ce que « MCP » désigne ici (le MCP Supabase de développement ? un MCP dans l'app ?) |
| 3 | UX et maquettes | `_bmad-output/planning-artifacts/ux-designs/` (`DESIGN.md`, `EXPERIENCE.md`, `mockups/`, `review-accessibility.md`), `docs/ux-resume.md`, `docs/audit-accessibilite.md`, `docs/ui-rules.md` | `03-ux-design-system.md` (assemblage et critères d'accessibilité) | moi ; **toi** : choisir les maquettes à montrer |
| 4 | Spécifications d'intégration : API Supabase et authentification | Migrations, fonctions SQL, Server Actions, Route Handler du chat, `proxy.ts`, `lib/supabase/` | `04-integration-api-auth.md` (contrats, droits, flux d'authentification, aucun webhook) | moi |
| 5 | Exigences de qualité de service (dashboard Supabase) | CI (`.github/workflows/ci.yml`), mesures Lighthouse du portfolio (journal) ; advisors Supabase lisibles par le MCP | `05-qos.md` (budgets, observabilité, modes dégradés) | les deux ; **toi** : captures du dashboard Supabase |
| 6 | Démo de l'application (lien / QR / démo) | `docs/parcours-demo.md`, scripts `scripts/seed-demo*.ts`, `docs/plan-recette.md` | `06-demo.md` (adresse, comptes fictifs, scénario) | **toi** : l'adresse de production, le QR ; moi : le scénario |
| 7 | Rapport d'évaluation (pertinence, hallucinations, latence, coût) | `tests/rag-run.ts`, `tests/rag-cases.json`, 20 questions et tableau des résultats dans `docs/rag-tests.md`. **Latence et coût ne sont pas mesurés aujourd'hui.** | `07-rapport-evaluation.md` (fait) | les deux : mesurer (appels payants à Mistral et Anthropic, environ 1 min 30 par exécution), **toi** : accord pour lancer |
| 8 | Registre des données et index RAG + gouvernance | Tables `notes`, `note_chunks`, modèle `mistral-embed` (1024 dimensions), `tests/purge.test.ts`, règles du `CLAUDE.md` | `08-registre-rag.md` | moi |
| 9 | Dossier de garde-fous et conformité (modération, données personnelles, journalisation) | Vérification des citations, note piégée du jeu de tests, quotas (`consume_ai_quota`), refus de conseil fiscal ou juridique, seules les notes liées au client envoyées, `ai_calls` (comptage seulement) | `09-garde-fous.md` (les manques sont écrits comme tels) | moi ; **toi** : valider |
| 10 | Dossier de déploiement : pipelines dev → prod, compte rendu de mise en production, rollback | `.github/workflows/ci.yml`, `isolation.yml`, `vercel.json` (région `cdg1`), PR et prévisualisations par branche | `10-deploiement.md` | les deux ; **toi** : état de la production et du retour arrière sur Vercel |
| 11 | Sécurité d'accès : SSO/MFA, matrice des droits, secrets | RLS partout (`rls_audit`), droits d'`anon` figés par un test, aucun `service_role` (test), `.env.local` ignoré. **MFA : non vérifié.** | `11-securite-acces.md` | **fait** (MFA : aucun, vérifié dans le code et la base ; reste à confirmer : inscription désactivée dans Supabase, révocation de 4 fonctions d'aide ouvertes à `anon`) |
| 12 | Continuité : sauvegardes (RPO/RTO), test de restauration, plan de continuité, mode dégradé | Pas de document. Sauvegardes Supabase : **offre et durée de rétention à confirmer** ; modes dégradés dans le code à relever | `12-continuite.md` (rédigé sur l'offre gratuite ; test de restauration à faire) | **toi** : offre Supabase ; moi : le reste |
| 13 | Exploitation et conformité : tableau de bord, kit support N1/N2 (FAQ, délais), registre RGPD synthétique | Logs Supabase et Vercel ; point ouvert du `CLAUDE.md` sur l'envoi d'extraits à Anthropic et Mistral | `13-exploitation-conformite.md` | moi ; **toi** : valider la partie RGPD |

## Ordre proposé (deux jours)

1. D'abord ce qui se déduit du dépôt, sans rien attendre de toi : 1, 4, 8, 9, 11, 2.
2. Puis ce qui demande un assemblage ou une mesure : 3, 7, 5, 10.
3. En dernier ce qui dépend de tes réponses : 6, 12, 13.

## Questions à trancher avec Alex

- Format attendu par le tuteur : Markdown suffit, ou Word ou PDF ? Un seul document ou un par livrable ?
- Ce que désigne « MCP » dans le livrable 2.
- Offre Supabase, MFA, état de la production Vercel.
- Accord pour lancer les mesures payantes du livrable 7.
