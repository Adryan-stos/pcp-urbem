begin;

-- Acesso temporário para o MVP enquanto autenticação, perfis e permissões
-- ainda não foram implementados. Não são criadas políticas de DELETE.

grant select, insert, update on public.recursos_produtivos to anon, authenticated;
grant select, insert, update on public.capacidades_recursos to anon, authenticated;
grant select, insert, update on public.calendarios_recursos to anon, authenticated;
grant select, insert, update on public.bloqueios_recursos to anon, authenticated;

drop policy if exists "mvp_ler_recursos_produtivos" on public.recursos_produtivos;
drop policy if exists "mvp_inserir_recursos_produtivos" on public.recursos_produtivos;
drop policy if exists "mvp_atualizar_recursos_produtivos" on public.recursos_produtivos;

create policy "mvp_ler_recursos_produtivos"
on public.recursos_produtivos for select
to anon, authenticated
using (true);

create policy "mvp_inserir_recursos_produtivos"
on public.recursos_produtivos for insert
to anon, authenticated
with check (true);

create policy "mvp_atualizar_recursos_produtivos"
on public.recursos_produtivos for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "mvp_ler_capacidades_recursos" on public.capacidades_recursos;
drop policy if exists "mvp_inserir_capacidades_recursos" on public.capacidades_recursos;
drop policy if exists "mvp_atualizar_capacidades_recursos" on public.capacidades_recursos;

create policy "mvp_ler_capacidades_recursos"
on public.capacidades_recursos for select
to anon, authenticated
using (true);

create policy "mvp_inserir_capacidades_recursos"
on public.capacidades_recursos for insert
to anon, authenticated
with check (true);

create policy "mvp_atualizar_capacidades_recursos"
on public.capacidades_recursos for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "mvp_ler_calendarios_recursos" on public.calendarios_recursos;
drop policy if exists "mvp_inserir_calendarios_recursos" on public.calendarios_recursos;
drop policy if exists "mvp_atualizar_calendarios_recursos" on public.calendarios_recursos;

create policy "mvp_ler_calendarios_recursos"
on public.calendarios_recursos for select
to anon, authenticated
using (true);

create policy "mvp_inserir_calendarios_recursos"
on public.calendarios_recursos for insert
to anon, authenticated
with check (true);

create policy "mvp_atualizar_calendarios_recursos"
on public.calendarios_recursos for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "mvp_ler_bloqueios_recursos" on public.bloqueios_recursos;
drop policy if exists "mvp_inserir_bloqueios_recursos" on public.bloqueios_recursos;
drop policy if exists "mvp_atualizar_bloqueios_recursos" on public.bloqueios_recursos;

create policy "mvp_ler_bloqueios_recursos"
on public.bloqueios_recursos for select
to anon, authenticated
using (true);

create policy "mvp_inserir_bloqueios_recursos"
on public.bloqueios_recursos for insert
to anon, authenticated
with check (true);

create policy "mvp_atualizar_bloqueios_recursos"
on public.bloqueios_recursos for update
to anon, authenticated
using (true)
with check (true);

commit;
