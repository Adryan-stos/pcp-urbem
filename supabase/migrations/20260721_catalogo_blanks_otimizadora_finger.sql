begin;

create table if not exists public.blanks (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  descricao text not null,
  classe text not null,
  espessura_mm numeric(10,2) not null check (espessura_mm > 0),
  largura_mm numeric(10,2) not null check (largura_mm > 0),
  comprimento_mm numeric(10,2) not null check (comprimento_mm > 0),
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint blanks_classe_normalizada check (classe = upper(trim(classe))),
  constraint blanks_dimensoes_unicas unique (classe, espessura_mm, largura_mm, comprimento_mm)
);

alter table public.op_processos
  add column if not exists blank_saida_id uuid references public.blanks(id) on delete restrict;

alter table public.op_apontamentos
  add column if not exists blank_saida_id uuid references public.blanks(id) on delete restrict;

create index if not exists idx_blanks_busca
  on public.blanks (classe, espessura_mm, largura_mm, comprimento_mm)
  where ativo = true;

create index if not exists idx_op_processos_blank_saida
  on public.op_processos (blank_saida_id)
  where blank_saida_id is not null;

alter table public.blanks enable row level security;

drop policy if exists "mvp_ler_blanks" on public.blanks;
create policy "mvp_ler_blanks"
on public.blanks for select
to anon, authenticated
using (ativo = true);

grant select on public.blanks to anon, authenticated;

create or replace function public.cadastrar_blank(
  p_classe text,
  p_espessura_mm numeric,
  p_largura_mm numeric,
  p_comprimento_mm numeric
)
returns setof public.blanks
language plpgsql
security definer
set search_path = public
as $$
declare
  v_classe text := upper(trim(coalesce(p_classe, '')));
  v_codigo text;
  v_descricao text;
  v_blank public.blanks%rowtype;
begin
  if v_classe = '' then
    raise exception 'Informe a classe do Blank.';
  end if;

  if coalesce(p_espessura_mm, 0) <= 0
    or coalesce(p_largura_mm, 0) <= 0
    or coalesce(p_comprimento_mm, 0) <= 0 then
    raise exception 'Espessura, largura e comprimento devem ser maiores que zero.';
  end if;

  v_codigo := 'BLK-' || regexp_replace(v_classe, '[^A-Z0-9]+', '', 'g') || '-'
    || replace(trim(to_char(p_espessura_mm, 'FM999999990.##')), '.', '_') || 'X'
    || replace(trim(to_char(p_largura_mm, 'FM999999990.##')), '.', '_') || 'X'
    || replace(trim(to_char(p_comprimento_mm, 'FM999999990.##')), '.', '_');
  v_descricao := 'BLANK ' || v_classe || ' - '
    || trim(to_char(p_espessura_mm, 'FM999999990.##')) || ' × '
    || trim(to_char(p_largura_mm, 'FM999999990.##')) || ' × '
    || trim(to_char(p_comprimento_mm, 'FM999999990.##')) || ' mm';

  insert into public.blanks (codigo, descricao, classe, espessura_mm, largura_mm, comprimento_mm)
  values (v_codigo, v_descricao, v_classe, p_espessura_mm, p_largura_mm, p_comprimento_mm)
  on conflict (classe, espessura_mm, largura_mm, comprimento_mm)
  do update set ativo = true, updated_at = now()
  returning * into v_blank;

  return next v_blank;
end;
$$;

revoke all on function public.cadastrar_blank(text, numeric, numeric, numeric) from public;
grant execute on function public.cadastrar_blank(text, numeric, numeric, numeric) to anon, authenticated;

-- Catálogo inicial: 63 padrões de saída válidos executados em julho/2026.
-- A função é idempotente; uma reexecução não cria itens duplicados.
select public.cadastrar_blank('C14', 36, 142, 10100);
select public.cadastrar_blank('C24', 36, 122, 10000);
select public.cadastrar_blank('C24', 36, 122, 10200);
select public.cadastrar_blank('C24', 36, 122, 10890);
select public.cadastrar_blank('C24', 36, 122, 11000);
select public.cadastrar_blank('C24', 36, 122, 11400);
select public.cadastrar_blank('C24', 36, 122, 11800);
select public.cadastrar_blank('C24', 36, 122, 12000);
select public.cadastrar_blank('C24', 36, 122, 12100);
select public.cadastrar_blank('C24', 36, 122, 12410);
select public.cadastrar_blank('C24', 36, 122, 9700);
select public.cadastrar_blank('C24', 36, 142, 10100);
select public.cadastrar_blank('C24', 36, 142, 10180);
select public.cadastrar_blank('C24', 36, 142, 11900);
select public.cadastrar_blank('C24', 36, 142, 12000);
select public.cadastrar_blank('C24', 36, 142, 6410);
select public.cadastrar_blank('C24', 36, 147, 10000);
select public.cadastrar_blank('C24', 36, 147, 10100);
select public.cadastrar_blank('C24', 36, 147, 10600);
select public.cadastrar_blank('C24', 36, 147, 11200);
select public.cadastrar_blank('C24', 36, 147, 12000);
select public.cadastrar_blank('C24', 36, 147, 12410);
select public.cadastrar_blank('C24', 36, 147, 14810);
select public.cadastrar_blank('C24', 36, 147, 7610);
select public.cadastrar_blank('C24', 36, 147, 9400);
select public.cadastrar_blank('C24', 36, 192, 10000);
select public.cadastrar_blank('C24', 36, 192, 10890);
select public.cadastrar_blank('C24', 36, 192, 11500);
select public.cadastrar_blank('C24', 36, 192, 12110);
select public.cadastrar_blank('C24', 36, 192, 12410);
select public.cadastrar_blank('C24', 36, 192, 13300);
select public.cadastrar_blank('C24', 36, 192, 13600);
select public.cadastrar_blank('C24', 36, 192, 14510);
select public.cadastrar_blank('C24', 36, 192, 14810);
select public.cadastrar_blank('C24', 36, 192, 14970);
select public.cadastrar_blank('C24', 36, 192, 6110);
select public.cadastrar_blank('C24', 36, 192, 8000);
select public.cadastrar_blank('C24', 36, 192, 8810);
select public.cadastrar_blank('C24', 36, 192, 8830);
select public.cadastrar_blank('C24', 36, 87, 10000);
select public.cadastrar_blank('C24', 36, 87, 12110);
select public.cadastrar_blank('C24', 36, 87, 12400);
select public.cadastrar_blank('C24', 36, 87, 12410);
select public.cadastrar_blank('C24', 36, 87, 13000);
select public.cadastrar_blank('C24', 36, 87, 13300);
select public.cadastrar_blank('C24', 36, 87, 6410);
select public.cadastrar_blank('C24', 36, 87, 7610);
select public.cadastrar_blank('C24', 36, 87, 8000);
select public.cadastrar_blank('C24', 36, 87, 8510);
select public.cadastrar_blank('C24', 36, 87, 8810);
select public.cadastrar_blank('C24', 36, 87, 9700);
select public.cadastrar_blank('C24', 46, 147, 11000);
select public.cadastrar_blank('C24', 46, 147, 11900);
select public.cadastrar_blank('C24', 46, 147, 12600);
select public.cadastrar_blank('C24', 48, 147, 10300);
select public.cadastrar_blank('C24', 48, 147, 10900);
select public.cadastrar_blank('C24', 48, 147, 11900);
select public.cadastrar_blank('C24', 48, 147, 12100);
select public.cadastrar_blank('C24', 48, 147, 3000);
select public.cadastrar_blank('C24', 48, 147, 6200);
select public.cadastrar_blank('C24', 48, 147, 6400);
select public.cadastrar_blank('C24', 48, 147, 9300);
select public.cadastrar_blank('C24', 48, 147, 9800);

commit;
