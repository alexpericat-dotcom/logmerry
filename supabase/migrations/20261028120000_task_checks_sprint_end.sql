-- Story 5.4b : coche de la règle 7 (fin de sprint proche), une par sprint et par jour : source_id = le sprint.
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
      else ceiling_key is null and threshold is null
    end
  );
