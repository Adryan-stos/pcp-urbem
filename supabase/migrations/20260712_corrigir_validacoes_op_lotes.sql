begin;

-- Corrige prioridades antigas duplicadas, preservando a ordem relativa de criação.
with fila_normalizada as (
  select
    id,
    row_number() over (
      partition by processo
      order by prioridade asc nulls last, created_at asc, id asc
    ) - 1 as nova_prioridade
  from public.op_lotes
  where ativo = true
    and prioridade is not null
)
update public.op_lotes as op_lote
set prioridade = fila_normalizada.nova_prioridade
from fila_normalizada
where op_lote.id = fila_normalizada.id;

-- NOT VALID preserva possíveis dados históricos inconsistentes, mas protege
-- todas as novas inclusões e alterações realizadas a partir desta migration.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'op_lote_itens_quantidade_positiva_inteira'
      and conrelid = 'public.op_lote_itens'::regclass
  ) then
    alter table public.op_lote_itens
      add constraint op_lote_itens_quantidade_positiva_inteira
      check (
        quantidade_prevista > 0
        and quantidade_prevista = trunc(quantidade_prevista)
      ) not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'op_lotes_prioridade_nao_negativa'
      and conrelid = 'public.op_lotes'::regclass
  ) then
    alter table public.op_lotes
      add constraint op_lotes_prioridade_nao_negativa
      check (prioridade is null or prioridade >= 0) not valid;
  end if;
end;
$$;

create or replace function public.validar_datas_op_lote()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.data_prevista_inicio is not null
    and new.data_prevista_inicio < date_trunc('minute', now()) then
    raise exception 'A data e a hora de início não podem ser anteriores ao momento atual.';
  end if;

  if new.data_prevista_fim is not null
    and new.data_prevista_fim < date_trunc('minute', now()) then
    raise exception 'A data e a hora de término não podem ser anteriores ao momento atual.';
  end if;

  if new.data_prevista_inicio is not null
    and new.data_prevista_fim is not null
    and new.data_prevista_fim < new.data_prevista_inicio then
    raise exception 'O fim previsto deve ser posterior ao início previsto.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validar_datas_op_lote on public.op_lotes;

create trigger trg_validar_datas_op_lote
before insert or update of data_prevista_inicio, data_prevista_fim
on public.op_lotes
for each row
execute function public.validar_datas_op_lote();

commit;
