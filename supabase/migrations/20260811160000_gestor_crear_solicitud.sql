create or replace function public.crear_solicitud_gestor(
  p_nombre text,
  p_tipo_solicitud_id uuid,
  p_cliente_id uuid,
  p_ubicacion_id uuid,
  p_detalle text
)
returns jsonb
language plpgsql
security definer
set search_path = '' as $$
declare
  v_usuario_id uuid := auth.uid();
  v_solicitud_id uuid;
  v_numero bigint;
begin
  if v_usuario_id is null or not public.es_gestor(v_usuario_id) then
    raise exception 'Solo un Administrador o Encargado puede crear solicitudes para un cliente';
  end if;

  if not exists (select 1 from public.clientes where id = p_cliente_id and activo) then
    raise exception 'El cliente indicado no existe o está inactivo';
  end if;

  if not exists (
    select 1 from public.ubicaciones
    where id = p_ubicacion_id and cliente_id = p_cliente_id and activa
  ) then
    raise exception 'La ubicación no pertenece al cliente o está inactiva';
  end if;

  if not exists (
    select 1 from public.tipos_solicitud
    where id = p_tipo_solicitud_id and activo
  ) then
    raise exception 'El tipo de solicitud no está disponible';
  end if;

  insert into public.solicitudes (
    nombre, tipo_solicitud_id, detalle, cliente_id, ubicacion_id, solicitante_id
  ) values (
    trim(p_nombre), p_tipo_solicitud_id, trim(p_detalle),
    p_cliente_id, p_ubicacion_id, v_usuario_id
  )
  returning id, numero into v_solicitud_id, v_numero;

  return jsonb_build_object('id', v_solicitud_id, 'numero', v_numero);
end;
$$;

revoke all on function public.crear_solicitud_gestor(text, uuid, uuid, uuid, text) from public;
grant execute on function public.crear_solicitud_gestor(text, uuid, uuid, uuid, text) to authenticated;
