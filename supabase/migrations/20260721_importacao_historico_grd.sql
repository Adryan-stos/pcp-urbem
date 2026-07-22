create table if not exists public.historico_grd_importado (
  id uuid primary key default gen_random_uuid(),
  fonte text not null default 'GRD',
  arquivo_origem text not null,
  aba_origem text not null,
  linha_origem integer not null,
  fabrica smallint not null check (fabrica in (1, 2)),
  processo text not null,
  numero_operacao text not null,
  status text not null default 'Concluído',
  projeto text,
  item text,
  recurso text,
  inicio_producao timestamptz,
  encerrado_em timestamptz not null,
  quantidade_pecas numeric not null default 0,
  volume_m3 numeric not null default 0,
  dados_origem jsonb not null default '{}'::jsonb,
  importado_em timestamptz not null default now(),
  unique (fonte, aba_origem, linha_origem)
);

create index if not exists idx_historico_grd_encerrado on public.historico_grd_importado(encerrado_em desc);
create index if not exists idx_historico_grd_processo on public.historico_grd_importado(fabrica, processo);
alter table public.historico_grd_importado enable row level security;

drop policy if exists "Leitura do histórico GRD" on public.historico_grd_importado;
create policy "Leitura do histórico GRD" on public.historico_grd_importado for select to authenticated using (true);
grant select on public.historico_grd_importado to authenticated;

create or replace function public.substituir_historico_grd(p_arquivo text, p_registros jsonb)
returns integer language plpgsql security definer set search_path = public as $$
declare v_total integer;
begin
  if auth.uid() is null then raise exception 'É necessário estar autenticado para substituir o histórico do GRD'; end if;
  if jsonb_typeof(p_registros) <> 'array' then raise exception 'Registros do GRD devem ser enviados como lista'; end if;
  delete from public.historico_grd_importado where fonte = 'GRD';
  insert into public.historico_grd_importado (
    fonte, arquivo_origem, aba_origem, linha_origem, fabrica, processo, numero_operacao, status,
    projeto, item, recurso, inicio_producao, encerrado_em, quantidade_pecas, volume_m3, dados_origem
  )
  select coalesce(x.fonte, 'GRD'), p_arquivo, x.aba_origem, x.linha_origem, x.fabrica, x.processo,
    x.numero_operacao, coalesce(x.status, 'Concluído'), x.projeto, x.item, x.recurso,
    x.inicio_producao, x.encerrado_em, coalesce(x.quantidade_pecas, 0), coalesce(x.volume_m3, 0), coalesce(x.dados_origem, '{}'::jsonb)
  from jsonb_to_recordset(p_registros) as x(
    fonte text, aba_origem text, linha_origem integer, fabrica smallint, processo text, numero_operacao text,
    status text, projeto text, item text, recurso text, inicio_producao timestamptz, encerrado_em timestamptz,
    quantidade_pecas numeric, volume_m3 numeric, dados_origem jsonb
  );
  get diagnostics v_total = row_count;
  return v_total;
end $$;

revoke all on function public.substituir_historico_grd(text, jsonb) from public;
grant execute on function public.substituir_historico_grd(text, jsonb) to authenticated;
