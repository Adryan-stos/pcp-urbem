create table if not exists public.reimpressoes_etiquetas (
  id uuid primary key default gen_random_uuid(),
  tipo_operacao text not null check (tipo_operacao in ('lote', 'processo')),
  op_lote_id uuid references public.op_lotes(id) on delete restrict,
  op_processo_id uuid references public.op_processos(id) on delete restrict,
  pacote_id uuid references public.pacotes_materia_prima(id) on delete restrict,
  numero_operacao text not null,
  processo text not null,
  reimpresso_por uuid references auth.users(id) on delete set null default auth.uid(),
  reimpresso_em timestamptz not null default now(),
  constraint reimpressao_origem_valida check (
    (tipo_operacao = 'lote' and op_lote_id is not null and op_processo_id is null)
    or (tipo_operacao = 'processo' and op_processo_id is not null and op_lote_id is null)
  )
);

create index if not exists idx_reimpressoes_op_lote on public.reimpressoes_etiquetas(op_lote_id);
create index if not exists idx_reimpressoes_op_processo on public.reimpressoes_etiquetas(op_processo_id);
create index if not exists idx_reimpressoes_data on public.reimpressoes_etiquetas(reimpresso_em desc);

alter table public.reimpressoes_etiquetas enable row level security;

drop policy if exists "Leitura de reimpressoes" on public.reimpressoes_etiquetas;
create policy "Leitura de reimpressoes" on public.reimpressoes_etiquetas for select to anon, authenticated using (true);

drop policy if exists "Registro de reimpressoes" on public.reimpressoes_etiquetas;
create policy "Registro de reimpressoes" on public.reimpressoes_etiquetas for insert to anon, authenticated with check (true);

grant select, insert on public.reimpressoes_etiquetas to anon, authenticated;
