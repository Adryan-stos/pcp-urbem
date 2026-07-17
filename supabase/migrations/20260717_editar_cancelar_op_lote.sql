begin;

alter table public.op_lotes
  add column if not exists cancelado_em timestamptz,
  add column if not exists motivo_cancelamento text;

create or replace function public.recalcular_reserva_pacote(p_pacote_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quantidade numeric;
  v_volume numeric;
begin
  select coalesce(sum(item.quantidade_prevista), 0), coalesce(sum(item.volume_previsto_m3), 0)
  into v_quantidade, v_volume
  from public.op_lote_itens item
  join public.op_lotes op on op.id = item.op_lote_id
  where item.estoque_item_id = p_pacote_id
    and item.status = 'Reservado'
    and op.ativo = true
    and op.status in ('Programado', 'Aguardando programação', 'Em produção', 'Em pausa');

  update public.pacotes_materia_prima
  set quantidade_reservada = v_quantidade,
      volume_reservado_m3 = v_volume,
      status = case when v_quantidade >= coalesce(quantidade_saldo, 0) then 'Reservado' else 'Disponível' end
  where id = p_pacote_id;
end;
$$;

create or replace function public.editar_materiais_op_lote(p_op_lote_id uuid, p_itens jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_op public.op_lotes%rowtype;
  v_item jsonb;
  v_pacote public.pacotes_materia_prima%rowtype;
  v_pacote_antigo uuid;
  v_pacotes_antigos uuid[];
  v_quantidade numeric;
  v_disponivel numeric;
  v_volume numeric;
begin
  select * into v_op from public.op_lotes where id = p_op_lote_id and ativo = true for update;
  if not found then raise exception 'OP de lote não encontrada.'; end if;
  if v_op.status not in ('Programado', 'Aguardando programação') then
    raise exception 'Somente OPs programadas ou aguardando programação podem ter a matéria-prima alterada.';
  end if;
  if p_itens is null or jsonb_typeof(p_itens) <> 'array' or jsonb_array_length(p_itens) = 0 then
    raise exception 'Selecione pelo menos um pacote de matéria-prima.';
  end if;
  if exists (select 1 from jsonb_array_elements(p_itens) item group by item ->> 'estoque_item_id' having count(*) > 1) then
    raise exception 'O mesmo pacote foi informado mais de uma vez.';
  end if;

  select array_agg(distinct estoque_item_id) into v_pacotes_antigos
  from public.op_lote_itens where op_lote_id = p_op_lote_id;
  for v_pacote_antigo in select unnest(coalesce(v_pacotes_antigos, array[]::uuid[])) loop
    perform 1 from public.pacotes_materia_prima where id = v_pacote_antigo for update;
  end loop;
  delete from public.op_lote_itens where op_lote_id = p_op_lote_id;
  for v_pacote_antigo in select unnest(coalesce(v_pacotes_antigos, array[]::uuid[])) loop
    perform public.recalcular_reserva_pacote(v_pacote_antigo);
  end loop;
  for v_pacote_antigo in select id from public.pacotes_materia_prima where id in (
    select (item ->> 'estoque_item_id')::uuid from jsonb_array_elements(p_itens) item
  ) for update loop
    perform public.recalcular_reserva_pacote(v_pacote_antigo);
  end loop;

  for v_item in select value from jsonb_array_elements(p_itens) loop
    v_quantidade := coalesce((v_item ->> 'quantidade_prevista')::numeric, 0);
    if v_quantidade <= 0 then raise exception 'A quantidade deve ser maior que zero.'; end if;

    select * into v_pacote from public.pacotes_materia_prima
    where id::text = v_item ->> 'estoque_item_id' and ativo = true and buffer_atual = v_op.buffer_entrada
    for update;
    if not found then raise exception 'Pacote inválido ou fora do buffer de entrada da OP.'; end if;

    v_disponivel := greatest(coalesce(v_pacote.quantidade_saldo, 0) - coalesce(v_pacote.quantidade_reservada, 0), 0);
    if v_quantidade > v_disponivel then
      raise exception 'Quantidade solicitada (%) superior ao saldo disponível (%) do pacote %.',
        v_quantidade, v_disponivel, coalesce(v_pacote.codigo_item, v_pacote.id::text);
    end if;
    v_volume := case when coalesce(v_pacote.quantidade_saldo, 0) > 0
      then round((v_quantidade / v_pacote.quantidade_saldo) * v_pacote.volume_saldo_m3, 6) else 0 end;

    insert into public.op_lote_itens(op_lote_id, estoque_item_id, quantidade_prevista, volume_previsto_m3, status)
    values (p_op_lote_id, v_pacote.id, v_quantidade, v_volume, 'Reservado');
    perform public.recalcular_reserva_pacote(v_pacote.id);
  end loop;

  return to_jsonb(v_op);
end;
$$;

create or replace function public.cancelar_op_lote(p_op_lote_id uuid, p_motivo text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_op public.op_lotes%rowtype;
  v_pacote_id uuid;
begin
  select * into v_op from public.op_lotes where id = p_op_lote_id and ativo = true for update;
  if not found then raise exception 'OP de lote não encontrada.'; end if;
  if v_op.processo not in ('AUTOCLAVE', 'GRADEADOR', 'ESTUFA', 'CLASSIFICADORA') then
    raise exception 'O cancelamento desta rotina é exclusivo da Fábrica 1.';
  end if;
  if v_op.status not in ('Programado', 'Aguardando programação') then
    raise exception 'Somente OPs ainda não iniciadas podem ser canceladas.';
  end if;
  if nullif(trim(p_motivo), '') is null then raise exception 'Informe o motivo do cancelamento.'; end if;

  update public.op_lote_itens set status = 'Cancelado' where op_lote_id = p_op_lote_id and status = 'Reservado';
  update public.op_lotes set status = 'Cancelado', ativo = false, cancelado_em = now(),
    motivo_cancelamento = trim(p_motivo), prioridade = null where id = p_op_lote_id;

  for v_pacote_id in select distinct estoque_item_id from public.op_lote_itens where op_lote_id = p_op_lote_id loop
    perform public.recalcular_reserva_pacote(v_pacote_id);
  end loop;

  update public.op_lotes set prioridade = prioridade - 1
  where ativo = true and processo = v_op.processo and prioridade > v_op.prioridade;

  select * into v_op from public.op_lotes where id = p_op_lote_id;
  return to_jsonb(v_op);
end;
$$;

revoke all on function public.recalcular_reserva_pacote(uuid) from public;
revoke all on function public.editar_materiais_op_lote(uuid, jsonb) from public;
revoke all on function public.cancelar_op_lote(uuid, text) from public;
grant execute on function public.editar_materiais_op_lote(uuid, jsonb) to anon, authenticated;
grant execute on function public.cancelar_op_lote(uuid, text) to anon, authenticated;

commit;
