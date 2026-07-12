begin;

create table if not exists public.recursos_produtivos (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  nome text not null,
  fabrica smallint not null check (fabrica in (1, 2)),
  processo text not null,
  tipo_recurso text not null default 'Máquina',
  quantidade_recursos integer not null default 1 check (quantidade_recursos > 0),
  observacao text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.capacidades_recursos (
  id uuid primary key default gen_random_uuid(),
  recurso_id uuid not null references public.recursos_produtivos(id),
  tipo_medicao text not null check (tipo_medicao in ('Por ciclo', 'Por hora', 'Por turno')),
  unidade text not null check (unidade in ('m³', 'Peças', 'Pacotes', 'Lotes')),
  capacidade_nominal numeric(14, 4) not null check (capacidade_nominal > 0),
  duracao_ciclo_minutos integer check (duracao_ciclo_minutos is null or duracao_ciclo_minutos > 0),
  tempo_setup_minutos integer not null default 0 check (tempo_setup_minutos >= 0),
  fonte text not null default 'Estimativa inicial',
  nivel_confianca text not null default 'Estimado'
    check (nivel_confianca in ('Estimado', 'Medido', 'Validado')),
  vigencia_inicio date not null default current_date,
  vigencia_fim date,
  observacao text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  check (vigencia_fim is null or vigencia_fim >= vigencia_inicio)
);

create table if not exists public.calendarios_recursos (
  id uuid primary key default gen_random_uuid(),
  recurso_id uuid not null references public.recursos_produtivos(id),
  dia_semana smallint not null check (dia_semana between 0 and 6),
  hora_inicio time not null,
  hora_fim time not null,
  intervalo_inicio time,
  intervalo_fim time,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  unique (recurso_id, dia_semana),
  check (hora_fim > hora_inicio),
  check (
    (intervalo_inicio is null and intervalo_fim is null)
    or (
      intervalo_inicio is not null
      and intervalo_fim is not null
      and intervalo_fim > intervalo_inicio
      and intervalo_inicio >= hora_inicio
      and intervalo_fim <= hora_fim
    )
  )
);

create table if not exists public.bloqueios_recursos (
  id uuid primary key default gen_random_uuid(),
  recurso_id uuid not null references public.recursos_produtivos(id),
  tipo text not null check (tipo in ('Manutenção', 'Feriado', 'Parada', 'Outro')),
  inicio timestamptz not null,
  fim timestamptz not null,
  motivo text not null,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  check (fim > inicio)
);

create index if not exists idx_capacidades_recurso_vigencia
  on public.capacidades_recursos (recurso_id, vigencia_inicio desc)
  where ativo = true;

create index if not exists idx_bloqueios_recurso_periodo
  on public.bloqueios_recursos (recurso_id, inicio, fim)
  where ativo = true;

insert into public.recursos_produtivos (
  codigo,
  nome,
  fabrica,
  processo,
  tipo_recurso,
  quantidade_recursos
)
values
  ('F1-AUTOCLAVE', 'Autoclave', 1, 'AUTOCLAVE', 'Equipamento por lote', 1),
  ('F1-GRADEADOR', 'Gradeador', 1, 'GRADEADOR', 'Linha de processo', 1),
  ('F1-ESTUFA', 'Estufa', 1, 'ESTUFA', 'Equipamento por lote', 1),
  ('F1-CLASSIFICADORA', 'Classificadora', 1, 'CLASSIFICADORA', 'Linha de processo', 1)
on conflict (codigo) do update
set
  nome = excluded.nome,
  fabrica = excluded.fabrica,
  processo = excluded.processo,
  tipo_recurso = excluded.tipo_recurso,
  updated_at = now();

grant select, insert, update on public.recursos_produtivos to anon, authenticated;
grant select, insert, update on public.capacidades_recursos to anon, authenticated;
grant select, insert, update on public.calendarios_recursos to anon, authenticated;
grant select, insert, update on public.bloqueios_recursos to anon, authenticated;

commit;
