begin;

create sequence if not exists public.pacote_saldo_numero_seq;

create or replace function public.iniciar_execucao_op_lote(
  p_op_lote_id uuid,
  p_operador text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_op public.op_lotes%rowtype;
begin
  select * into v_op
  from public.op_lotes
  where id = p_op_lote_id
    and ativo = true
  for update;

  if not found then
    raise exception 'OP de lote não encontrada.';
  end if;

  if v_op.status = 'Em produção' then
    return to_jsonb(v_op);
  end if;

  if v_op.status <> 'Programado' then
    raise exception 'Somente uma OP programada pode ser iniciada. Status atual: %.', v_op.status;
  end if;

  update public.op_lotes
  set
    status = 'Em produção',
    inicio_producao = coalesce(inicio_producao, now()),
    iniciado_por = coalesce(nullif(trim(p_operador), ''), iniciado_por)
  where id = p_op_lote_id
  returning * into v_op;

  return to_jsonb(v_op);
end;
$$;

create or replace function public.finalizar_etapa_op_lote(
  p_op_lote_id uuid,
  p_operador text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_op public.op_lotes%rowtype;
  v_item public.op_lote_itens%rowtype;
  v_pacote public.pacotes_materia_prima%rowtype;
  v_quantidade_restante numeric;
  v_volume_restante numeric;
  v_codigo_saldo text;
  v_pacotes_movidos jsonb := '[]'::jsonb;
  v_pacotes_saldo jsonb := '[]'::jsonb;
begin
  select * into v_op
  from public.op_lotes
  where id = p_op_lote_id
    and ativo = true
  for update;

  if not found then
    raise exception 'OP de lote não encontrada.';
  end if;

  if v_op.processo not in ('AUTOCLAVE', 'GRADEADOR', 'ESTUFA') then
    raise exception 'A finalização simples não se aplica ao processo %.', v_op.processo;
  end if;

  if v_op.status <> 'Em produção' then
    raise exception 'A OP deve estar Em produção antes da finalização.';
  end if;

  for v_item in
    select *
    from public.op_lote_itens
    where op_lote_id = p_op_lote_id
      and status = 'Reservado'
    order by id
    for update
  loop
    select * into v_pacote
    from public.pacotes_materia_prima
    where id = v_item.estoque_item_id
      and ativo = true
    for update;

    if not found then
      raise exception 'Pacote reservado não encontrado.';
    end if;

    if v_pacote.buffer_atual <> v_op.buffer_entrada then
      raise exception 'O pacote % não está mais no buffer de entrada da OP.', coalesce(v_pacote.codigo_pacote, v_pacote.id::text);
    end if;

    if coalesce(v_pacote.quantidade_reservada, 0) <> v_item.quantidade_prevista then
      raise exception
        'O pacote % possui reserva em outra OP. Finalize ou cancele a outra reserva antes de continuar.',
        coalesce(v_pacote.codigo_pacote, v_pacote.id::text);
    end if;

    if v_item.quantidade_prevista > v_pacote.quantidade_saldo then
      raise exception 'A quantidade reservada é maior que o saldo do pacote %.', coalesce(v_pacote.codigo_pacote, v_pacote.id::text);
    end if;

    v_quantidade_restante := v_pacote.quantidade_saldo - v_item.quantidade_prevista;
    v_volume_restante := greatest(0, v_pacote.volume_saldo_m3 - v_item.volume_previsto_m3);

    if v_quantidade_restante > 0 then
      v_codigo_saldo := format(
        'PAC-SALDO-%s-%s',
        to_char(current_date, 'YYYYMMDD'),
        lpad(nextval('public.pacote_saldo_numero_seq')::text, 6, '0')
      );

      insert into public.pacotes_materia_prima (
        recebimento_id,
        recebimento_item_id,
        codigo_pacote,
        especie,
        classe,
        espessura_mm,
        largura_mm,
        comprimento_mm,
        quantidade_inicial,
        quantidade_saldo,
        volume_inicial_m3,
        volume_saldo_m3,
        quantidade_reservada,
        volume_reservado_m3,
        buffer_atual,
        rua,
        secao,
        localizacao,
        fsc,
        status,
        ativo
      ) values (
        v_pacote.recebimento_id,
        v_pacote.recebimento_item_id,
        v_codigo_saldo,
        v_pacote.especie,
        v_pacote.classe,
        v_pacote.espessura_mm,
        v_pacote.largura_mm,
        v_pacote.comprimento_mm,
        v_quantidade_restante,
        v_quantidade_restante,
        v_volume_restante,
        v_volume_restante,
        0,
        0,
        v_op.buffer_entrada,
        v_pacote.rua,
        v_pacote.secao,
        v_pacote.localizacao,
        v_pacote.fsc,
        'Disponível',
        true
      );

      v_pacotes_saldo := v_pacotes_saldo || jsonb_build_array(v_codigo_saldo);
    end if;

    update public.pacotes_materia_prima
    set
      quantidade_inicial = v_item.quantidade_prevista,
      quantidade_saldo = v_item.quantidade_prevista,
      volume_inicial_m3 = v_item.volume_previsto_m3,
      volume_saldo_m3 = v_item.volume_previsto_m3,
      quantidade_reservada = 0,
      volume_reservado_m3 = 0,
      buffer_atual = v_op.buffer_saida,
      rua = v_pacote.rua,
      secao = v_pacote.secao,
      localizacao = v_op.buffer_saida,
      status = 'Disponível'
    where id = v_pacote.id;

    update public.op_lote_itens
    set status = 'Processado'
    where id = v_item.id;

    v_pacotes_movidos := v_pacotes_movidos || jsonb_build_array(
      coalesce(v_pacote.codigo_pacote, v_pacote.id::text)
    );
  end loop;

  if jsonb_array_length(v_pacotes_movidos) = 0 then
    raise exception 'A OP não possui pacotes reservados para processar.';
  end if;

  update public.op_lotes
  set
    status = 'Concluído',
    fim_producao = now(),
    finalizado_por = nullif(trim(p_operador), '')
  where id = p_op_lote_id
  returning * into v_op;

  return jsonb_build_object(
    'op_lote', to_jsonb(v_op),
    'pacotes_movidos', v_pacotes_movidos,
    'pacotes_saldo', v_pacotes_saldo
  );
end;
$$;

revoke all on function public.finalizar_etapa_op_lote(uuid, text) from public;
grant execute on function public.finalizar_etapa_op_lote(uuid, text) to anon, authenticated;

commit;
