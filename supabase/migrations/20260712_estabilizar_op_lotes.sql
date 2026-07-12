begin;

alter table public.pacotes_materia_prima
  add column if not exists quantidade_reservada numeric not null default 0,
  add column if not exists volume_reservado_m3 numeric not null default 0;

-- Recupera as reservas criadas antes desta migration sem alterar o saldo físico.
with reservas as (
  select
    estoque_item_id,
    sum(coalesce(quantidade_prevista, 0)) as quantidade_reservada,
    sum(coalesce(volume_previsto_m3, 0)) as volume_reservado_m3
  from public.op_lote_itens
  where status = 'Reservado'
  group by estoque_item_id
)
update public.pacotes_materia_prima as pacote
set
  quantidade_reservada = least(
    coalesce(pacote.quantidade_saldo, 0),
    coalesce(reservas.quantidade_reservada, 0)
  ),
  volume_reservado_m3 = least(
    coalesce(pacote.volume_saldo_m3, 0),
    coalesce(reservas.volume_reservado_m3, 0)
  )
from reservas
where pacote.id = reservas.estoque_item_id;

update public.pacotes_materia_prima
set status = case
  when coalesce(quantidade_saldo, 0) - coalesce(quantidade_reservada, 0) <= 0
    then 'Reservado'
  else 'Disponível'
end
where ativo = true
  and status in ('Disponível', 'Reservado');

create sequence if not exists public.op_lote_numero_seq;

create or replace function public.criar_op_lote_transacional(
  p_processo text,
  p_prioridade integer,
  p_data_prevista_inicio timestamptz,
  p_data_prevista_fim timestamptz,
  p_observacao text,
  p_itens jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_processo text;
  v_buffer_entrada text;
  v_buffer_saida text;
  v_numero_op_lote text;
  v_op_lote_id public.op_lotes.id%type;
  v_item jsonb;
  v_pacote public.pacotes_materia_prima%rowtype;
  v_quantidade numeric;
  v_quantidade_disponivel numeric;
  v_volume_disponivel numeric;
  v_volume_reservado numeric;
  v_prioridade_final integer;
  v_total_programado integer;
  v_resultado jsonb;
begin
  v_processo := replace(replace(upper(trim(coalesce(p_processo, ''))), '/', '_'), ' ', '_');

  select entrada, saida
  into v_buffer_entrada, v_buffer_saida
  from (
    values
      ('AUTOCLAVE', 'BUFFER AUTOCLAVE', 'BUFFER SERRADO TRATADO'),
      ('GRADEADOR', 'BUFFER SERRADO TRATADO', 'BUFFER TRATADO GRADEADO'),
      ('ESTUFA', 'BUFFER TRATADO GRADEADO', 'BUFFER TRATADO SECO'),
      ('CLASSIFICADORA', 'BUFFER TRATADO SECO', 'BUFFER PRE OTIMIZAÇÃO')
  ) as fluxo(processo, entrada, saida)
  where processo = v_processo;

  if v_buffer_entrada is null or v_buffer_saida is null then
    raise exception 'Processo % sem fluxo de estoque configurado para OP de lote.', v_processo;
  end if;

  if p_prioridade is not null and p_prioridade < 0 then
    raise exception 'A prioridade não pode ser negativa.';
  end if;

  if p_data_prevista_inicio is not null
    and p_data_prevista_fim is not null
    and p_data_prevista_fim < p_data_prevista_inicio then
    raise exception 'O fim previsto deve ser posterior ao início previsto.';
  end if;

  if p_itens is null
    or jsonb_typeof(p_itens) <> 'array'
    or jsonb_array_length(p_itens) = 0 then
    raise exception 'Selecione pelo menos um item de estoque para a OP de lote.';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_itens) as item
    group by item ->> 'estoque_item_id'
    having count(*) > 1
  ) then
    raise exception 'O mesmo pacote de matéria-prima foi informado mais de uma vez.';
  end if;

  -- Serializa a fila do processo e evita prioridades duplicadas.
  perform pg_advisory_xact_lock(hashtext('op_lotes:' || v_processo));

  select count(*)
  into v_total_programado
  from public.op_lotes
  where ativo = true
    and processo = v_processo
    and prioridade is not null;

  v_prioridade_final := case
    when p_prioridade is null then null
    else least(p_prioridade, v_total_programado)
  end;

  if v_prioridade_final is not null then
    update public.op_lotes
    set prioridade = prioridade + 1
    where ativo = true
      and processo = v_processo
      and prioridade is not null
      and prioridade >= v_prioridade_final;
  end if;

  v_numero_op_lote := format(
    'OPL-%s-%s-%s',
    v_processo,
    to_char(current_date, 'YYYYMMDD'),
    lpad(nextval('public.op_lote_numero_seq')::text, 6, '0')
  );

  insert into public.op_lotes (
    numero_op_lote,
    processo,
    buffer_entrada,
    buffer_saida,
    prioridade,
    data_prevista_inicio,
    data_prevista_fim,
    observacao,
    status
  )
  values (
    v_numero_op_lote,
    v_processo,
    v_buffer_entrada,
    v_buffer_saida,
    v_prioridade_final,
    p_data_prevista_inicio,
    p_data_prevista_fim,
    nullif(trim(p_observacao), ''),
    case
      when v_prioridade_final is null then 'Aguardando programação'
      else 'Programado'
    end
  )
  returning id into v_op_lote_id;

  for v_item in select value from jsonb_array_elements(p_itens)
  loop
    v_quantidade := coalesce((v_item ->> 'quantidade_prevista')::numeric, 0);

    if v_quantidade <= 0 then
      raise exception 'A quantidade reservada deve ser maior que zero.';
    end if;

    select *
    into v_pacote
    from public.pacotes_materia_prima
    where id::text = v_item ->> 'estoque_item_id'
      and ativo = true
      and buffer_atual = v_buffer_entrada
    for update;

    if not found then
      raise exception 'Pacote de matéria-prima inválido ou fora do buffer %.', v_buffer_entrada;
    end if;

    v_quantidade_disponivel := greatest(
      coalesce(v_pacote.quantidade_saldo, 0) - coalesce(v_pacote.quantidade_reservada, 0),
      0
    );
    v_volume_disponivel := greatest(
      coalesce(v_pacote.volume_saldo_m3, 0) - coalesce(v_pacote.volume_reservado_m3, 0),
      0
    );

    if v_quantidade > v_quantidade_disponivel then
      raise exception
        'Quantidade solicitada (%) superior ao saldo disponível (%) do pacote %.',
        v_quantidade,
        v_quantidade_disponivel,
        coalesce(v_pacote.codigo_pacote, v_pacote.id::text);
    end if;

    v_volume_reservado := case
      when v_quantidade_disponivel > 0
        then round((v_quantidade / v_quantidade_disponivel) * v_volume_disponivel, 6)
      else 0
    end;

    insert into public.op_lote_itens (
      op_lote_id,
      estoque_item_id,
      quantidade_prevista,
      volume_previsto_m3,
      status
    )
    values (
      v_op_lote_id,
      v_pacote.id,
      v_quantidade,
      v_volume_reservado,
      'Reservado'
    );

    update public.pacotes_materia_prima
    set
      quantidade_reservada = coalesce(quantidade_reservada, 0) + v_quantidade,
      volume_reservado_m3 = coalesce(volume_reservado_m3, 0) + v_volume_reservado,
      status = case
        when v_quantidade_disponivel - v_quantidade <= 0 then 'Reservado'
        else 'Disponível'
      end
    where id = v_pacote.id;
  end loop;

  select to_jsonb(op_lote)
  into v_resultado
  from public.op_lotes as op_lote
  where id = v_op_lote_id;

  return v_resultado;
end;
$$;

create or replace function public.reordenar_op_lotes_transacional(
  p_processo text,
  p_op_lote_ids jsonb
)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_processo text;
  v_total_ativo integer;
  v_item record;
  v_atualizados integer := 0;
begin
  v_processo := replace(replace(upper(trim(coalesce(p_processo, ''))), '/', '_'), ' ', '_');

  if p_op_lote_ids is null or jsonb_typeof(p_op_lote_ids) <> 'array' then
    raise exception 'A nova ordem da fila deve ser uma lista.';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_op_lote_ids) as item
    group by item
    having count(*) > 1
  ) then
    raise exception 'A fila contém uma OP de lote duplicada.';
  end if;

  perform pg_advisory_xact_lock(hashtext('op_lotes:' || v_processo));

  select count(*)
  into v_total_ativo
  from public.op_lotes
  where ativo = true
    and processo = v_processo;

  if v_total_ativo <> jsonb_array_length(p_op_lote_ids) then
    raise exception 'A fila foi alterada por outro usuário. Atualize a tela e tente novamente.';
  end if;

  for v_item in
    select value #>> '{}' as id, ordinality - 1 as prioridade
    from jsonb_array_elements(p_op_lote_ids) with ordinality
  loop
    update public.op_lotes
    set prioridade = v_item.prioridade
    where id::text = v_item.id
      and ativo = true
      and processo = v_processo;

    if not found then
      raise exception 'A fila contém uma OP de lote inválida.';
    end if;

    v_atualizados := v_atualizados + 1;
  end loop;

  return v_atualizados;
end;
$$;

grant usage, select on sequence public.op_lote_numero_seq to authenticated;
grant execute on function public.criar_op_lote_transacional(
  text, integer, timestamptz, timestamptz, text, jsonb
) to authenticated;
grant execute on function public.reordenar_op_lotes_transacional(text, jsonb) to authenticated;

commit;
