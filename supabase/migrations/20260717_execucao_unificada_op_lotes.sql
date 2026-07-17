begin;

alter table public.op_lotes
  add column if not exists tempo_execucao_segundos integer not null default 0,
  add column if not exists tempo_parado_segundos integer not null default 0;

alter table public.paradas_producao
  alter column op_processo_id drop not null,
  add column if not exists op_lote_id uuid references public.op_lotes(id) on delete cascade;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'paradas_producao_alvo_unico'
      and conrelid = 'public.paradas_producao'::regclass
  ) then
    alter table public.paradas_producao
      add constraint paradas_producao_alvo_unico
      check (num_nonnulls(op_processo_id, op_lote_id) = 1) not valid;
  end if;
end;
$$;

create index if not exists idx_paradas_producao_op_lote
  on public.paradas_producao(op_lote_id, inicio_parada);

create or replace function public.pausar_execucao_op_lote(
  p_op_lote_id uuid,
  p_motivo_parada_id uuid,
  p_motivo text,
  p_observacao text default null,
  p_registrado_por text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_op public.op_lotes%rowtype;
  v_parada public.paradas_producao%rowtype;
begin
  select * into v_op from public.op_lotes
  where id = p_op_lote_id and ativo = true
  for update;

  if not found then raise exception 'OP de lote não encontrada.'; end if;
  if v_op.status <> 'Em produção' then
    raise exception 'Somente uma OP Em produção pode ser pausada.';
  end if;

  if exists (
    select 1 from public.paradas_producao
    where op_lote_id = p_op_lote_id and status = 'Em pausa'
  ) then
    raise exception 'Já existe uma parada aberta para esta OP.';
  end if;

  insert into public.paradas_producao (
    op_processo_id,
    op_lote_id,
    inicio_parada,
    motivo_parada_id,
    motivo,
    observacao,
    status,
    registrado_por
  ) values (
    null,
    p_op_lote_id,
    now(),
    p_motivo_parada_id,
    coalesce(nullif(trim(p_motivo), ''), 'Motivo cadastrado'),
    nullif(trim(p_observacao), ''),
    'Em pausa',
    coalesce(nullif(trim(p_registrado_por), ''), 'DESENVOLVIMENTO')
  ) returning * into v_parada;

  update public.op_lotes set status = 'Em pausa' where id = p_op_lote_id;
  return to_jsonb(v_parada);
end;
$$;

create or replace function public.retomar_execucao_op_lote(p_op_lote_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_parada public.paradas_producao%rowtype;
  v_duracao integer;
begin
  select * into v_parada
  from public.paradas_producao
  where op_lote_id = p_op_lote_id and status = 'Em pausa'
  order by inicio_parada desc
  limit 1
  for update;

  if not found then raise exception 'Nenhuma parada aberta para esta OP.'; end if;

  v_duracao := greatest(0, floor(extract(epoch from (now() - v_parada.inicio_parada)))::integer);

  update public.paradas_producao
  set
    fim_parada = now(),
    duracao_segundos = v_duracao,
    status = 'Finalizada',
    motivo_fechamento = 'Retomada'
  where id = v_parada.id
  returning * into v_parada;

  update public.op_lotes set status = 'Em produção' where id = p_op_lote_id;
  return to_jsonb(v_parada);
end;
$$;

create or replace function public.fechar_parada_e_calcular_tempos_op_lote(p_op_lote_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inicio timestamptz;
  v_total_parado integer;
  v_total_bruto integer;
begin
  update public.paradas_producao
  set
    fim_parada = now(),
    duracao_segundos = greatest(0, floor(extract(epoch from (now() - inicio_parada)))::integer),
    status = 'Finalizada',
    motivo_fechamento = 'Finalização'
  where op_lote_id = p_op_lote_id and status = 'Em pausa';

  select inicio_producao into v_inicio
  from public.op_lotes where id = p_op_lote_id;

  select coalesce(sum(duracao_segundos), 0)::integer into v_total_parado
  from public.paradas_producao where op_lote_id = p_op_lote_id;

  v_total_bruto := greatest(0, floor(extract(epoch from (now() - coalesce(v_inicio, now()))))::integer);

  update public.op_lotes
  set
    status = case when status = 'Em pausa' then 'Em produção' else status end,
    tempo_parado_segundos = v_total_parado,
    tempo_execucao_segundos = greatest(0, v_total_bruto - v_total_parado)
  where id = p_op_lote_id;

  return jsonb_build_object(
    'tempo_bruto_segundos', v_total_bruto,
    'tempo_parado_segundos', v_total_parado,
    'tempo_execucao_segundos', greatest(0, v_total_bruto - v_total_parado)
  );
end;
$$;

create or replace function public.finalizar_etapa_op_lote_com_tempos(
  p_op_lote_id uuid,
  p_operador text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tempos jsonb;
  v_resultado jsonb;
begin
  v_tempos := public.fechar_parada_e_calcular_tempos_op_lote(p_op_lote_id);
  v_resultado := public.finalizar_etapa_op_lote(p_op_lote_id, p_operador);
  return v_resultado || jsonb_build_object('tempos', v_tempos);
end;
$$;

create or replace function public.finalizar_classificacao_op_lote_com_tempos(
  p_op_lote_id uuid,
  p_saidas jsonb,
  p_perdas jsonb default '[]'::jsonb,
  p_operador text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tempos jsonb;
  v_resultado jsonb;
begin
  v_tempos := public.fechar_parada_e_calcular_tempos_op_lote(p_op_lote_id);
  v_resultado := public.finalizar_classificacao_op_lote(p_op_lote_id, p_saidas, p_perdas, p_operador);
  return v_resultado || jsonb_build_object('tempos', v_tempos);
end;
$$;

revoke all on function public.pausar_execucao_op_lote(uuid, uuid, text, text, text) from public;
revoke all on function public.retomar_execucao_op_lote(uuid) from public;
revoke all on function public.fechar_parada_e_calcular_tempos_op_lote(uuid) from public;
revoke all on function public.finalizar_etapa_op_lote_com_tempos(uuid, text) from public;
revoke all on function public.finalizar_classificacao_op_lote_com_tempos(uuid, jsonb, jsonb, text) from public;

grant execute on function public.pausar_execucao_op_lote(uuid, uuid, text, text, text) to anon, authenticated;
grant execute on function public.retomar_execucao_op_lote(uuid) to anon, authenticated;
grant execute on function public.finalizar_etapa_op_lote_com_tempos(uuid, text) to anon, authenticated;
grant execute on function public.finalizar_classificacao_op_lote_com_tempos(uuid, jsonb, jsonb, text) to anon, authenticated;

commit;
