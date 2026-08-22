-- La función valida el rol y ejecuta la sustitución de asignaciones de forma
-- transaccional, sin depender de escrituras directas permitidas por RLS.
create or replace function public.asignar_tecnicos_solicitud(
  p_solicitud_id uuid,
  p_tecnicos uuid[]
)
returns void
language plpgsql
security definer
set search_path = '' as $$
declare
  v_usuario uuid := auth.uid();
begin
  if v_usuario is null then
    raise exception 'La sesión no es válida';
  end if;

  if not public.es_gestor(v_usuario) and not exists (
    select 1
    from public.solicitudes s
    where s.id = p_solicitud_id
      and s.operador_id = v_usuario
      and public.tiene_rol('operador', v_usuario)
  ) then
    raise exception 'No tiene permiso para asignar técnicos a esta solicitud';
  end if;

  if not exists (select 1 from public.solicitudes where id = p_solicitud_id) then
    raise exception 'La solicitud no existe';
  end if;

  if exists (
    select 1
    from unnest(coalesce(p_tecnicos, '{}'::uuid[])) tecnico_id
    left join public.tecnicos t on t.id = tecnico_id
    where t.id is null or not t.activo
  ) then
    raise exception 'Todos los técnicos deben existir y estar activos';
  end if;

  delete from public.solicitud_tecnicos
  where solicitud_id = p_solicitud_id;

  insert into public.solicitud_tecnicos (
    solicitud_id,
    tecnico_id,
    asignado_por
  )
  select p_solicitud_id, tecnico_id, v_usuario
  from unnest(coalesce(p_tecnicos, '{}'::uuid[])) tecnico_id;
end;
$$;

revoke all on function public.asignar_tecnicos_solicitud(uuid, uuid[]) from public;
grant execute on function public.asignar_tecnicos_solicitud(uuid, uuid[]) to authenticated;
