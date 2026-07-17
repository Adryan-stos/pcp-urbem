begin;

alter table public.op_lotes
  add column if not exists inicio_producao timestamptz,
  add column if not exists fim_producao timestamptz,
  add column if not exists iniciado_por text,
  add column if not exists finalizado_por text;

create sequence if not exists public.pacote_classificado_numero_seq;

create table if not exists public.op_lote_classificacoes (
  id uuid primary key default gen_random_uuid(),
  op_lote_id uuid not null references public.op_lotes(id) on delete cascade,
  pacote_origem_id uuid not null references public.pacotes_materia_prima(id),
  pacote_saida_id uuid not null references public.pacotes_materia_prima(id),
  classe_saida text not null check (
    classe_saida in ('C24', 'C14', 'NÃO ESTRUTURAL', 'MADEIRA ÚMIDA', 'MADEIRA TORTA')
  ),
  espessura_mm numeric not null check (espessura_mm > 0),
  largura_mm numeric not null check (largura_mm > 0),
  comprimento_mm numeric not null check (comprimento_mm > 0),
  quantidade_saida numeric not null check (quantidade_saida > 0),
  volume_saida_m3 numeric not null check (volume_saida_m3 >= 0),
  operador text,
  created_at timestamptz not null default now()
);

create index if not exists idx_op_lote_classificacoes_op
  on public.op_lote_classificacoes(op_lote_id);

create index if not exists idx_op_lote_classificacoes_origem
  on public.op_lote_classificacoes(pacote_origem_id);

create index if not exists idx_op_lote_classificacoes_saida
  on public.op_lote_classificacoes(pacote_saida_id);

alter table public.op_lote_classificacoes enable row level security;

drop policy if exists "mvp_leitura_op_lote_classificacoes" on public.op_lote_classificacoes;
create policy "mvp_leitura_op_lote_classificacoes"
  on public.op_lote_classificacoes
  for select
  to anon, authenticated
  using (true);

grant select on public.op_lote_classificacoes to anon, authenticated;

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

  if v_op.status in ('Concluído', 'Cancelado') then
    raise exception 'A OP de lote não pode ser iniciada no status %.', v_op.status;
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

create or replace function public.finalizar_classificacao_op_lote(
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
  v_op public.op_lotes%rowtype;
  v_item record;
  v_saida jsonb;
  v_pacote_origem public.pacotes_materia_prima%rowtype;
  v_pacote_saida_id uuid;
  v_classe text;
  v_espessura numeric;
  v_largura numeric;
  v_comprimento numeric;
  v_quantidade numeric;
  v_volume numeric;
  v_perda numeric;
  v_total_saida numeric;
  v_codigo text;
  v_resultado jsonb;
begin
  select * into v_op
  from public.op_lotes
  where id = p_op_lote_id
    and ativo = true
  for update;

  if not found then
    raise exception 'OP de lote não encontrada.';
  end if;

  if v_op.processo <> 'CLASSIFICADORA' then
    raise exception 'Esta finalização é exclusiva da Classificadora.';
  end if;

  if v_op.status <> 'Em produção' then
    raise exception 'A OP deve estar Em produção antes da finalização.';
  end if;

  if p_saidas is null
    or jsonb_typeof(p_saidas) <> 'array'
    or jsonb_array_length(p_saidas) = 0 then
    raise exception 'Informe pelo menos uma saída classificada.';
  end if;

  if p_perdas is null or jsonb_typeof(p_perdas) <> 'array' then
    raise exception 'As perdas devem ser informadas como uma lista.';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_saidas) saida
    where upper(trim(saida ->> 'classe_saida')) not in (
      'C24', 'C14', 'NÃO ESTRUTURAL', 'MADEIRA ÚMIDA', 'MADEIRA TORTA'
    )
  ) then
    raise exception 'Existe uma classificação de saída inválida.';
  end if;

  -- Cada pacote reservado deve ser totalmente explicado por saídas + perdas.
  for v_item in
    select
      oli.estoque_item_id as pacote_id,
      oli.quantidade_prevista
    from public.op_lote_itens oli
    where oli.op_lote_id = p_op_lote_id
      and oli.status = 'Reservado'
  loop
    select coalesce(sum((saida ->> 'quantidade_saida')::numeric), 0)
    into v_total_saida
    from jsonb_array_elements(p_saidas) saida
    where saida ->> 'pacote_origem_id' = v_item.pacote_id::text;

    select coalesce(sum((perda ->> 'quantidade_perda')::numeric), 0)
    into v_perda
    from jsonb_array_elements(p_perdas) perda
    where perda ->> 'pacote_origem_id' = v_item.pacote_id::text;

    if v_total_saida < 0 or v_perda < 0 then
      raise exception 'Quantidades de saída e perda não podem ser negativas.';
    end if;

    if v_total_saida + v_perda <> v_item.quantidade_prevista then
      raise exception
        'O pacote % possui % peças reservadas, mas foram informadas % peças de saída e % de perda.',
        v_item.pacote_id,
        v_item.quantidade_prevista,
        v_total_saida,
        v_perda;
    end if;
  end loop;

  if exists (
    select 1
    from jsonb_array_elements(p_saidas) saida
    where not exists (
      select 1
      from public.op_lote_itens oli
      where oli.op_lote_id = p_op_lote_id
        and oli.estoque_item_id::text = saida ->> 'pacote_origem_id'
        and oli.status = 'Reservado'
    )
  ) then
    raise exception 'Uma das saídas referencia um pacote que não pertence à OP.';
  end if;

  for v_saida in select value from jsonb_array_elements(p_saidas)
  loop
    v_classe := upper(trim(v_saida ->> 'classe_saida'));
    v_espessura := coalesce((v_saida ->> 'espessura_mm')::numeric, 0);
    v_largura := coalesce((v_saida ->> 'largura_mm')::numeric, 0);
    v_comprimento := coalesce((v_saida ->> 'comprimento_mm')::numeric, 0);
    v_quantidade := coalesce((v_saida ->> 'quantidade_saida')::numeric, 0);

    if v_espessura <= 0 or v_largura <= 0 or v_comprimento <= 0 or v_quantidade <= 0 then
      raise exception 'Dimensões e quantidade de saída devem ser maiores que zero.';
    end if;

    select * into v_pacote_origem
    from public.pacotes_materia_prima
    where id::text = v_saida ->> 'pacote_origem_id'
    for update;

    if not found then
      raise exception 'Pacote de origem não encontrado.';
    end if;

    v_volume := round(
      (v_espessura * v_largura * v_comprimento * v_quantidade) / 1000000000,
      6
    );
    v_codigo := format(
      'PAC-CLASS-%s-%s',
      to_char(current_date, 'YYYYMMDD'),
      lpad(nextval('public.pacote_classificado_numero_seq')::text, 6, '0')
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
      v_pacote_origem.recebimento_id,
      v_pacote_origem.recebimento_item_id,
      v_codigo,
      v_pacote_origem.especie,
      v_classe,
      v_espessura,
      v_largura,
      v_comprimento,
      v_quantidade,
      v_quantidade,
      v_volume,
      v_volume,
      0,
      0,
      v_op.buffer_saida,
      v_pacote_origem.rua,
      v_pacote_origem.secao,
      v_op.buffer_saida,
      v_pacote_origem.fsc,
      'Disponível',
      true
    ) returning id into v_pacote_saida_id;

    insert into public.op_lote_classificacoes (
      op_lote_id,
      pacote_origem_id,
      pacote_saida_id,
      classe_saida,
      espessura_mm,
      largura_mm,
      comprimento_mm,
      quantidade_saida,
      volume_saida_m3,
      operador
    ) values (
      p_op_lote_id,
      v_pacote_origem.id,
      v_pacote_saida_id,
      v_classe,
      v_espessura,
      v_largura,
      v_comprimento,
      v_quantidade,
      v_volume,
      nullif(trim(p_operador), '')
    );
  end loop;

  -- O saldo reservado foi integralmente processado; perdas não geram pacote de saída.
  update public.pacotes_materia_prima pacote
  set
    quantidade_saldo = greatest(0, pacote.quantidade_saldo - item.quantidade_prevista),
    volume_saldo_m3 = greatest(0, pacote.volume_saldo_m3 - item.volume_previsto_m3),
    quantidade_reservada = greatest(0, pacote.quantidade_reservada - item.quantidade_prevista),
    volume_reservado_m3 = greatest(0, pacote.volume_reservado_m3 - item.volume_previsto_m3),
    status = case
      when pacote.quantidade_saldo - item.quantidade_prevista <= 0 then 'Consumido'
      else 'Disponível'
    end
  from public.op_lote_itens item
  where item.op_lote_id = p_op_lote_id
    and item.status = 'Reservado'
    and pacote.id = item.estoque_item_id;

  update public.op_lote_itens
  set status = 'Consumido'
  where op_lote_id = p_op_lote_id
    and status = 'Reservado';

  update public.op_lotes
  set
    status = 'Concluído',
    fim_producao = now(),
    finalizado_por = nullif(trim(p_operador), '')
  where id = p_op_lote_id;

  select jsonb_build_object(
    'op_lote', to_jsonb(op),
    'saidas', coalesce(jsonb_agg(
      jsonb_build_object(
        'classificacao_id', classificacao.id,
        'pacote_origem_id', classificacao.pacote_origem_id,
        'pacote_saida_id', classificacao.pacote_saida_id,
        'classe', classificacao.classe_saida,
        'espessura_mm', classificacao.espessura_mm,
        'largura_mm', classificacao.largura_mm,
        'comprimento_mm', classificacao.comprimento_mm,
        'quantidade', classificacao.quantidade_saida,
        'volume_m3', classificacao.volume_saida_m3,
        'pacote', to_jsonb(pacote_saida)
      ) order by classificacao.created_at
    ), '[]'::jsonb)
  ) into v_resultado
  from public.op_lotes op
  left join public.op_lote_classificacoes classificacao
    on classificacao.op_lote_id = op.id
  left join public.pacotes_materia_prima pacote_saida
    on pacote_saida.id = classificacao.pacote_saida_id
  where op.id = p_op_lote_id
  group by op.id;

  return v_resultado;
end;
$$;

revoke all on function public.iniciar_execucao_op_lote(uuid, text) from public;
revoke all on function public.finalizar_classificacao_op_lote(uuid, jsonb, jsonb, text) from public;

grant execute on function public.iniciar_execucao_op_lote(uuid, text) to anon, authenticated;
grant execute on function public.finalizar_classificacao_op_lote(uuid, jsonb, jsonb, text) to anon, authenticated;

commit;
