create or replace function public.guardar_control_ruta(
  p_solicitud_id uuid,
  p_vehiculo_id uuid,
  p_provincia text,
  p_canton text,
  p_distrito text,
  p_otras_senas text,
  p_latitud numeric,
  p_longitud numeric,
  p_estado_vehiculo public.estado_vehiculo,
  p_estado_checkpoint public.estado_checkpoint,
  p_operarios jsonb
)
returns void
language plpgsql
set search_path = '' as $$
declare
  v_operario jsonb;
  v_operario_id uuid;
  v_operador_principal uuid;
  v_estado public.estado_operario_ruta;
begin
  if not public.es_gestor() then
    raise exception 'Solo un administrador o encargado puede gestionar rutas';
  end if;

  select s.operador_id into v_operador_principal
    from public.solicitudes s
    where s.id = p_solicitud_id
      and s.estado in ('asignada', 'en_atencion', 'en_espera_materiales', 'atendida');

  if not found then
    raise exception 'La solicitud no admite control de ruta en su estado actual';
  end if;

  if not exists (
    select 1 from public.vehiculos v where v.id = p_vehiculo_id and v.activo
  ) then
    raise exception 'El vehículo seleccionado no está activo';
  end if;

  if jsonb_typeof(coalesce(p_operarios, '[]'::jsonb)) <> 'array'
    or jsonb_array_length(coalesce(p_operarios, '[]'::jsonb)) = 0 then
    raise exception 'Debe asignar al menos un operario';
  end if;

  if not exists (
    select 1 from jsonb_array_elements(p_operarios) item
    where item ->> 'operario_id' = v_operador_principal::text
  ) then
    raise exception 'El operador principal debe formar parte de la ruta';
  end if;

  if length(trim(p_provincia)) = 0 or length(trim(p_canton)) = 0
    or length(trim(p_distrito)) = 0 then
    raise exception 'Provincia, cantón y distrito son obligatorios';
  end if;

  insert into public.rutas (
    solicitud_id, vehiculo_id, provincia, canton, distrito, otras_senas,
    latitud, longitud, estado_vehiculo, estado_checkpoint, creado_por
  ) values (
    p_solicitud_id, p_vehiculo_id, trim(p_provincia), trim(p_canton),
    trim(p_distrito), nullif(trim(p_otras_senas), ''), p_latitud, p_longitud,
    p_estado_vehiculo, p_estado_checkpoint, auth.uid()
  )
  on conflict (solicitud_id) do update set
    vehiculo_id = excluded.vehiculo_id,
    provincia = excluded.provincia,
    canton = excluded.canton,
    distrito = excluded.distrito,
    otras_senas = excluded.otras_senas,
    latitud = excluded.latitud,
    longitud = excluded.longitud,
    estado_vehiculo = excluded.estado_vehiculo,
    estado_checkpoint = excluded.estado_checkpoint;

  delete from public.ruta_operarios where solicitud_id = p_solicitud_id;

  for v_operario in select value from jsonb_array_elements(p_operarios)
  loop
    v_operario_id := (v_operario ->> 'operario_id')::uuid;
    v_estado := (v_operario ->> 'estado')::public.estado_operario_ruta;

    if not exists (
      select 1
      from public.usuario_roles ur
      join public.roles r on r.id = ur.rol_id
      join public.usuarios u on u.id = ur.usuario_id
      where ur.usuario_id = v_operario_id and r.codigo = 'operador' and u.activo
    ) then
      raise exception 'El usuario % no es un operario activo', v_operario_id;
    end if;

    insert into public.ruta_operarios (solicitud_id, operario_id, estado)
    values (p_solicitud_id, v_operario_id, v_estado)
    on conflict (solicitud_id, operario_id) do update set estado = excluded.estado;
  end loop;
end;
$$;

revoke all on function public.guardar_control_ruta(
  uuid, uuid, text, text, text, text, numeric, numeric,
  public.estado_vehiculo, public.estado_checkpoint, jsonb
) from public;

grant execute on function public.guardar_control_ruta(
  uuid, uuid, text, text, text, text, numeric, numeric,
  public.estado_vehiculo, public.estado_checkpoint, jsonb
) to authenticated;
