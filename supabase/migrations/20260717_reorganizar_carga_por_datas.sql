begin;

create or replace function public.atualizar_planejamento_e_reordenar(
  p_tipo text,
  p_id uuid,
  p_inicio timestamptz,
  p_fim timestamptz
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_tipo text := lower(trim(coalesce(p_tipo, '')));
  v_processo text;
  v_item record;
  v_total integer := 0;
begin
  if p_inicio is null or p_fim is null then
    raise exception 'Informe o início e o término previstos.';
  end if;

  if p_inicio < date_trunc('minute', now()) then
    raise exception 'A data e a hora de início não podem ser anteriores ao momento atual.';
  end if;

  if p_fim < date_trunc('minute', now()) then
    raise exception 'A data e a hora de término não podem ser anteriores ao momento atual.';
  end if;

  if p_fim <= p_inicio then
    raise exception 'O término previsto deve ser posterior ao início previsto.';
  end if;

  if v_tipo = 'lote' then
    select processo into v_processo
    from public.op_lotes
    where id = p_id and ativo = true
    for update;

    if not found then
      raise exception 'OP de lote não encontrada ou inativa.';
    end if;

    perform pg_advisory_xact_lock(hashtext('carga_datas:op_lotes:' || v_processo));

    update public.op_lotes
    set data_prevista_inicio = p_inicio,
        data_prevista_fim = p_fim
    where id = p_id;

    update public.op_lotes
    set prioridade = prioridade + 100000
    where ativo = true and processo = v_processo and prioridade is not null;

    update public.op_lotes
    set prioridade = null
    where ativo = true and processo = v_processo and data_prevista_inicio is null;

    for v_item in
      select id, row_number() over (
        order by data_prevista_inicio asc, prioridade asc nulls last, created_at asc, id asc
      ) - 1 as nova_prioridade
      from public.op_lotes
      where ativo = true and processo = v_processo and data_prevista_inicio is not null
    loop
      update public.op_lotes set prioridade = v_item.nova_prioridade where id = v_item.id;
      v_total := v_total + 1;
    end loop;

  elsif v_tipo = 'processo' then
    select processo into v_processo
    from public.op_processos
    where id = p_id and ativo = true
    for update;

    if not found then
      raise exception 'Processo da OP não encontrado ou inativo.';
    end if;

    perform pg_advisory_xact_lock(hashtext('carga_datas:op_processos:' || v_processo));

    update public.op_processos
    set data_prevista_inicio = p_inicio,
        data_prevista_fim = p_fim
    where id = p_id;

    update public.op_processos
    set prioridade = prioridade + 100000
    where ativo = true and processo = v_processo and prioridade is not null;

    update public.op_processos
    set prioridade = null
    where ativo = true and processo = v_processo and data_prevista_inicio is null;

    for v_item in
      select id, row_number() over (
        order by data_prevista_inicio asc, prioridade asc nulls last, created_at asc, id asc
      ) - 1 as nova_prioridade
      from public.op_processos
      where ativo = true and processo = v_processo and data_prevista_inicio is not null
    loop
      update public.op_processos set prioridade = v_item.nova_prioridade where id = v_item.id;
      v_total := v_total + 1;
    end loop;
  else
    raise exception 'Tipo de operação inválido. Use lote ou processo.';
  end if;

  return jsonb_build_object(
    'tipo', v_tipo,
    'processo', v_processo,
    'itens_reordenados', v_total
  );
end;
$$;

grant execute on function public.atualizar_planejamento_e_reordenar(
  text, uuid, timestamptz, timestamptz
) to anon, authenticated;

commit;
