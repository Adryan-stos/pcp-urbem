begin;

-- A Estufa já existente é preservada para não romper vínculos de OPs,
-- calendários, capacidades ou bloqueios cadastrados anteriormente.
update public.recursos_produtivos
set
  codigo = 'F1-ESTUFA-01',
  nome = 'Estufa 01',
  tipo_recurso = 'Equipamento por lote',
  quantidade_recursos = 1,
  observacao = concat_ws(' | ', nullif(observacao, ''), 'Dimensões preliminares: 7,00 × 4,00 × 3,50 m. Capacidade geométrica provisória: 98,00 m³. Capacidade útil e tempo de ciclo pendentes de validação.')
where fabrica = 1
  and processo = 'ESTUFA'
  and codigo = 'F1-ESTUFA';

insert into public.recursos_produtivos (
  codigo,
  nome,
  fabrica,
  processo,
  tipo_recurso,
  quantidade_recursos,
  observacao,
  ativo
)
values
  ('F1-ESTUFA-02', 'Estufa 02', 1, 'ESTUFA', 'Equipamento por lote', 1, 'Dimensões preliminares: 7,00 × 4,00 × 3,50 m. Capacidade geométrica provisória: 98,00 m³. Capacidade útil e tempo de ciclo pendentes de validação.', true),
  ('F1-ESTUFA-03', 'Estufa 03', 1, 'ESTUFA', 'Equipamento por lote', 1, 'Dimensões preliminares: 7,00 × 4,00 × 3,50 m. Capacidade geométrica provisória: 98,00 m³. Capacidade útil e tempo de ciclo pendentes de validação.', true)
on conflict (codigo) do update
set
  nome = excluded.nome,
  fabrica = excluded.fabrica,
  processo = excluded.processo,
  tipo_recurso = excluded.tipo_recurso,
  quantidade_recursos = excluded.quantidade_recursos,
  observacao = excluded.observacao,
  ativo = true;

commit;
