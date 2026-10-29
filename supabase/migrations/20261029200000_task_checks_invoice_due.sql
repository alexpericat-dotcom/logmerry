-- Règle 8 du cockpit (« Facturer » : mission terminée sans facture) : coche du jour, une par mission (source_id = la mission).
alter table public.task_checks drop constraint task_checks_rule_no_check;
alter table public.task_checks add constraint task_checks_rule_no_check check (rule_no between 1 and 8);

alter table public.task_checks drop constraint task_checks_rule_shape;
alter table public.task_checks
  add constraint task_checks_rule_shape check (
    case rule_no
      when 2 then source_id is not null and ceiling_key is null and threshold is null
      when 3 then source_id is null and ceiling_key is not null and threshold is not null
      when 4 then source_id is null and ceiling_key is null and threshold is null
      when 5 then source_id is not null and ceiling_key is null and threshold is null
      when 6 then source_id is null and ceiling_key is null and threshold is null
      when 7 then source_id is not null and ceiling_key is null and threshold is null
      when 8 then source_id is not null and ceiling_key is null and threshold is null
      else ceiling_key is null and threshold is null
    end
  );
