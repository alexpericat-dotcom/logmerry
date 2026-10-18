-- Story 3.6 : une mission créée par un devis accepté démarre « à planifier ».
-- Fichier séparé : une valeur d'énumération ajoutée n'est utilisable qu'après validation de la transaction.
alter type public.mission_status add value if not exists 'planned' before 'in_progress';
