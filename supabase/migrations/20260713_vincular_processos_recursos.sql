begin;

alter table public.op_processos
  add column if not exists recurso_id uuid
  references public.recursos_produtivos(id) on delete restrict;

alter table public.op_lotes
  add column if not exists recurso_id uuid
  references public.recursos_produtivos(id) on delete restrict;

create index if not exists idx_op_processos_recurso
  on public.op_processos (recurso_id)
  where recurso_id is not null;

create index if not exists idx_op_lotes_recurso
  on public.op_lotes (recurso_id)
  where recurso_id is not null;

-- Mantém o mesmo id do recurso genérico para preservar vínculos já existentes.
update public.recursos_produtivos
set
  codigo = 'F2-CNC-01',
  nome = 'CNC 01',
  tipo_recurso = 'Máquina individual',
  quantidade_recursos = 1,
  updated_at = now()
where codigo = 'F2-CNC'
  and not exists (
    select 1 from public.recursos_produtivos where codigo = 'F2-CNC-01'
  );

insert into public.recursos_produtivos (
  codigo, nome, fabrica, processo, tipo_recurso, quantidade_recursos
)
values (
  'F2-CNC-02', 'CNC 02', 2, 'CNC', 'Máquina individual', 1
)
on conflict (codigo) do update
set
  nome = excluded.nome,
  fabrica = excluded.fabrica,
  processo = excluded.processo,
  tipo_recurso = excluded.tipo_recurso,
  quantidade_recursos = excluded.quantidade_recursos,
  updated_at = now();

create or replace function public.validar_recurso_processo()
returns trigger
language plpgsql
as $$
declare
  v_processo text;
begin
  if new.recurso_id is null then
    return new;
  end if;

  select processo
    into v_processo
  from public.recursos_produtivos
  where id = new.recurso_id
    and ativo = true;

  if v_processo is null then
    raise exception 'O recurso selecionado não existe ou está inativo.';
  end if;

  if upper(trim(v_processo)) <> upper(trim(new.processo)) then
    raise exception 'O recurso selecionado pertence ao processo %, não a %.',
      v_processo, new.processo;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validar_recurso_op_processo on public.op_processos;
create trigger trg_validar_recurso_op_processo
before insert or update of recurso_id, processo
on public.op_processos
for each row execute function public.validar_recurso_processo();

drop trigger if exists trg_validar_recurso_op_lote on public.op_lotes;
create trigger trg_validar_recurso_op_lote
before insert or update of recurso_id, processo
on public.op_lotes
for each row execute function public.validar_recurso_processo();

commit;
