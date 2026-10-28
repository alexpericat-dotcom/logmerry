-- Story 5.3 : coches des règles 3 (plafond atteint) et 4 (fin d'ACRE).
-- Règle 3 : clé = plafond + seuil (cocher 90 % ne masque pas 100 %), sans source. Règle 4 : la règle seule. Règle 2 : toujours une facture (source_id).
alter table public.task_checks
  add column ceiling_key text check (ceiling_key in ('ceiling_turnover_micro', 'ceiling_vat_franchise', 'ceiling_vat_tolerance')),
  add column threshold smallint check (threshold in (50, 75, 90, 100)),
  alter column source_id drop not null;

-- Les valeurs nulles comptent comme égales : une coche de règle 4 (tout nul sauf le jour) reste unique par jour.
alter table public.task_checks drop constraint task_checks_owner_id_rule_no_source_id_period_start_key;
alter table public.task_checks
  add constraint task_checks_unique_key unique nulls not distinct (owner_id, rule_no, source_id, ceiling_key, threshold, period_start);

-- Cohérence par règle : une coche ne porte que les colonnes de sa règle. Les règles 1, 5, 6 et 7 gardent leur source libre (stories 5.4).
alter table public.task_checks
  add constraint task_checks_rule_shape check (
    case rule_no
      when 2 then source_id is not null and ceiling_key is null and threshold is null
      when 3 then source_id is null and ceiling_key is not null and threshold is not null
      when 4 then source_id is null and ceiling_key is null and threshold is null
      else ceiling_key is null and threshold is null
    end
  );
