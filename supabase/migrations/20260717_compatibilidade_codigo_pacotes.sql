begin;

-- Compatibilidade temporária: as rotinas de execução foram inicialmente
-- escritas com codigo_pacote, enquanto a coluna existente é codigo_item.
alter table public.pacotes_materia_prima
  add column if not exists codigo_pacote text;

update public.pacotes_materia_prima
set codigo_pacote = codigo_item
where codigo_pacote is null;

create or replace function public.sincronizar_codigo_pacote()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.codigo_item is null and new.codigo_pacote is not null then
    new.codigo_item := new.codigo_pacote;
  elsif new.codigo_pacote is null and new.codigo_item is not null then
    new.codigo_pacote := new.codigo_item;
  elsif tg_op = 'UPDATE' and new.codigo_item is distinct from old.codigo_item then
    new.codigo_pacote := new.codigo_item;
  elsif tg_op = 'UPDATE' and new.codigo_pacote is distinct from old.codigo_pacote then
    new.codigo_item := new.codigo_pacote;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_sincronizar_codigo_pacote on public.pacotes_materia_prima;
create trigger trg_sincronizar_codigo_pacote
before insert or update of codigo_item, codigo_pacote
on public.pacotes_materia_prima
for each row execute function public.sincronizar_codigo_pacote();

commit;
