-- Una ruta puede durar varios días: fecha_programada es el inicio y fecha_fin (opcional) el último
-- día; sin fecha_fin la ruta es de un solo día, como hasta ahora. Lo usan el calendario (la ruta
-- aparece en cada día de su rango) y las recomendaciones (fechas programadas y plazos dentro del
-- rango). guardar_ruta_proceso recibe p_fecha_fin al final con valor por defecto; se elimina la
-- firma anterior para que PostgREST no encuentre dos versiones ambiguas.
-- Cuerpo base: 20260922130000_vehiculo_ruta_opcional.sql (vigente), con solo los cambios de fecha_fin.

alter table public.rutas_proceso
  add column if not exists fecha_fin date;
alter table public.rutas_proceso drop constraint if exists rutas_proceso_fecha_fin_check;
alter table public.rutas_proceso add constraint rutas_proceso_fecha_fin_check
  check (fecha_fin is null or fecha_fin >= fecha_programada);

drop function if exists public.guardar_ruta_proceso(
  uuid, text, text, text, date, public.estado_ruta_proceso, uuid, uuid[], uuid[], jsonb
);

create or replace function public.guardar_ruta_proceso(
  p_id uuid,
  p_codigo text,
  p_nombre text,
  p_descripcion text,
  p_fecha date,
  p_estado public.estado_ruta_proceso,
  p_responsable_id uuid,
  p_solicitudes uuid[],
  p_vehiculos uuid[],
  p_participantes jsonb,
  p_fecha_fin date default null
) returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_id uuid;
  v_item uuid;
  v_orden integer := 0;
  v_codigo text;
  v_nombre text;
begin
  if not public.es_gestor() then
    raise exception 'Solo un administrador o encargado puede definir rutas';
  end if;
  if p_fecha_fin is not null and p_fecha_fin < p_fecha then
    raise exception 'La fecha de fin no puede ser anterior a la fecha de inicio';
  end if;
  if coalesce(array_length(p_solicitudes, 1), 0) = 0 then
    raise exception 'Incluya al menos una solicitud';
  end if;
  if p_participantes is null or jsonb_typeof(p_participantes) <> 'array'
    or jsonb_array_length(p_participantes) = 0 then
    raise exception 'Incluya al menos un participante';
  end if;
  if not exists (
    select 1
    from public.usuarios u
    join public.usuario_roles ur on ur.usuario_id = u.id
    join public.roles r on r.id = ur.rol_id
    where u.id = p_responsable_id
      and u.activo
      and r.codigo in ('operador', 'encargado')
  ) then
    raise exception 'El responsable debe ser un operario o encargado activo';
  end if;
  if not exists (
    select 1
    from jsonb_array_elements(p_participantes) participante
    where participante ->> 'usuario_id' = p_responsable_id::text
  ) then
    raise exception 'El responsable debe estar incluido entre los participantes';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(p_participantes) participante
    where nullif(participante ->> 'usuario_id', '') is null
      or coalesce((participante ->> 'viatico')::numeric, 0) < 0
      or not exists (
        select 1
        from public.usuarios u
        join public.usuario_roles ur on ur.usuario_id = u.id
        join public.roles r on r.id = ur.rol_id
        where u.id = (participante ->> 'usuario_id')::uuid
          and u.activo
          and r.codigo in ('operador', 'encargado')
      )
  ) then
    raise exception 'Todos los participantes deben ser operarios o encargados activos y tener un viático válido';
  end if;
  if (
    select count(*)
    from jsonb_array_elements(p_participantes)
  ) <> (
    select count(distinct participante ->> 'usuario_id')
    from jsonb_array_elements(p_participantes) participante
  ) then
    raise exception 'No se puede repetir un participante';
  end if;
  if exists (
    select 1
    from unnest(p_vehiculos) identificador
    join public.vehiculos v on v.id = identificador
    where not v.activo or v.estado = 'mantenimiento'
  ) or (
    select count(*) from unnest(p_vehiculos)
  ) <> (
    select count(*) from public.vehiculos where id = any(p_vehiculos)
  ) then
    raise exception 'Todos los vehículos deben estar activos y disponibles para operación';
  end if;

  v_codigo := upper(trim(p_codigo));
  v_nombre := coalesce(nullif(trim(p_nombre), ''), v_codigo);

  if p_id is null then
    insert into public.rutas_proceso(
      codigo, nombre, descripcion, fecha_programada, fecha_fin, estado, responsable_id, creado_por
    ) values (
      v_codigo, v_nombre, nullif(trim(p_descripcion), ''), p_fecha, p_fecha_fin,
      p_estado, p_responsable_id, auth.uid()
    ) returning id into v_id;
  else
    update public.rutas_proceso
    set codigo = v_codigo,
      nombre = v_nombre,
      descripcion = nullif(trim(p_descripcion), ''),
      fecha_programada = p_fecha,
      fecha_fin = p_fecha_fin,
      estado = p_estado,
      responsable_id = p_responsable_id
    where id = p_id
    returning id into v_id;
    if v_id is null then
      raise exception 'Ruta no encontrada';
    end if;
    delete from public.ruta_solicitudes where ruta_id = v_id;
    delete from public.ruta_vehiculos where ruta_id = v_id;
  end if;

  foreach v_item in array p_solicitudes loop
    v_orden := v_orden + 1;
    insert into public.ruta_solicitudes(ruta_id, solicitud_id, orden)
    values(v_id, v_item, v_orden);
  end loop;

  v_orden := 0;
  foreach v_item in array p_vehiculos loop
    v_orden := v_orden + 1;
    insert into public.ruta_vehiculos(ruta_id, vehiculo_id, es_principal)
    values(v_id, v_item, v_orden = 1);
  end loop;

  delete from public.ruta_participantes participante_actual
  where participante_actual.ruta_id = v_id
    and not exists (
      select 1
      from jsonb_array_elements(p_participantes) participante_nuevo
      where participante_nuevo ->> 'usuario_id' = participante_actual.usuario_id::text
    );

  insert into public.ruta_participantes(
    ruta_id, usuario_id, viatico, detalle_viatico
  )
  select
    v_id,
    (participante ->> 'usuario_id')::uuid,
    coalesce((participante ->> 'viatico')::numeric, 0),
    nullif(trim(participante ->> 'detalle_viatico'), '')
  from jsonb_array_elements(p_participantes) participante
  on conflict (ruta_id, usuario_id) do update
  set viatico = excluded.viatico,
    detalle_viatico = excluded.detalle_viatico;

  return v_id;
end
$$;

revoke all on function public.guardar_ruta_proceso(
  uuid, text, text, text, date, public.estado_ruta_proceso, uuid, uuid[], uuid[], jsonb, date
) from public;
grant execute on function public.guardar_ruta_proceso(
  uuid, text, text, text, date, public.estado_ruta_proceso, uuid, uuid[], uuid[], jsonb, date
) to authenticated;
