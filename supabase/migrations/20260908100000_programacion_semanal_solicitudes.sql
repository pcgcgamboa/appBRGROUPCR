create table public.programacion_solicitudes (
  solicitud_id uuid primary key references public.solicitudes(id) on delete cascade,
  semana_inicio date not null,
  programado_por uuid not null references public.usuarios(id) on delete restrict,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  check (extract(isodow from semana_inicio) = 1)
);

create index programacion_solicitudes_semana_idx
on public.programacion_solicitudes(semana_inicio, solicitud_id);

create trigger programacion_solicitudes_actualizado
before update on public.programacion_solicitudes
for each row execute function public.actualizar_marca_tiempo();

alter table public.programacion_solicitudes enable row level security;
create policy programacion_solicitudes_lectura on public.programacion_solicitudes
for select to authenticated using (public.es_gestor());
create policy programacion_solicitudes_gestion on public.programacion_solicitudes
for all to authenticated using (public.es_gestor())
with check (public.es_gestor() and programado_por = auth.uid());
grant select, insert, update, delete on public.programacion_solicitudes to authenticated;

create or replace function public.programar_solicitud_semana(
  p_solicitud_id uuid,
  p_fecha date
) returns void language plpgsql set search_path = '' as $$
declare v_lunes date;
begin
  if not public.es_gestor() then
    raise exception 'Solo administradores y encargados pueden programar solicitudes';
  end if;
  if not exists (
    select 1 from public.solicitudes
    where id = p_solicitud_id
      and estado not in ('cerrada', 'cancelada', 'rechazada')
  ) then
    raise exception 'La solicitud no está disponible para programación';
  end if;
  v_lunes := p_fecha - (extract(isodow from p_fecha)::integer - 1);
  insert into public.programacion_solicitudes(solicitud_id, semana_inicio, programado_por)
  values(p_solicitud_id, v_lunes, auth.uid())
  on conflict(solicitud_id) do update
  set semana_inicio = excluded.semana_inicio,
      programado_por = excluded.programado_por;
end $$;

revoke all on function public.programar_solicitud_semana(uuid, date) from public;
grant execute on function public.programar_solicitud_semana(uuid, date) to authenticated;
