begin;

insert into public.recursos_produtivos (
  codigo,
  nome,
  fabrica,
  processo,
  tipo_recurso,
  quantidade_recursos
)
values
  ('F2-OTIMIZADORA-FINGER', 'Otimizadora / Finger', 2, 'OTIMIZADORA/FINGER', 'Linha de processo', 1),
  ('F2-PLAINA', 'Plainas', 2, 'PLAINA', 'Linha de processo', 1),
  ('F2-PRENSA', 'Prensas', 2, 'PRENSA', 'Linha de processo', 1),
  ('F2-DESTOPADEIRA', 'Destopadeira', 2, 'DESTOPADEIRA', 'Máquina individual', 1),
  ('F2-CNC', 'CNC', 2, 'CNC', 'Máquina individual', 1),
  ('F2-ACABAMENTO', 'Acabamento', 2, 'ACABAMENTO', 'Recurso manual', 1)
on conflict (codigo) do update
set
  nome = excluded.nome,
  fabrica = excluded.fabrica,
  processo = excluded.processo,
  tipo_recurso = excluded.tipo_recurso,
  updated_at = now();

commit;
