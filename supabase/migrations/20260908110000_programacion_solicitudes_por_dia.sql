alter table public.programacion_solicitudes
  drop constraint programacion_solicitudes_semana_inicio_check;

alter table public.programacion_solicitudes
  rename column semana_inicio to fecha_programada;

drop index public.programacion_solicitudes_semana_idx;
create index programacion_solicitudes_fecha_idx
on public.programacion_solicitudes(fecha_programada, solicitud_id);

create or replace function public.programar_solicitud_semana(
  p_solicitud_id uuid,
  p_fecha date
) returns void language plpgsql set search_path = '' as $$
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
  insert into public.programacion_solicitudes(
    solicitud_id, fecha_programada, programado_por
  ) values (p_solicitud_id, p_fecha, auth.uid())
  on conflict(solicitud_id) do update
  set fecha_programada = excluded.fecha_programada,
      programado_por = excluded.programado_por;
end $$;
