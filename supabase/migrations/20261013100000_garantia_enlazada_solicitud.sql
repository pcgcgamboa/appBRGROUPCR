-- Garantía enlazada a la solicitud original.
--
-- Antes, el Cliente solo podía reclamar garantía creando una solicitud de un tipo de catálogo
-- marcado `es_garantia`, que además exigía un equipo; si el administrador no había creado ese tipo,
-- la garantía era imposible. Ahora una garantía es una solicitud nueva enlazada por
-- `solicitud_original_id` a una solicitud cerrada con garantía vigente: hereda tipo, ubicación,
-- equipo y cliente de la original, y queda registrada en el seguimiento de AMBAS solicitudes.
-- (crear_solicitud_portal/crear_solicitud_gestor con tipos `es_garantia` siguen funcionando igual.)

create index if not exists solicitudes_solicitud_original_idx
  on public.solicitudes (solicitud_original_id) where solicitud_original_id is not null;

create or replace function public.aplicar_garantia_solicitud(
  p_solicitud_original_id uuid,
  p_detalle text,
  p_idempotencia_clave uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = '' as $$
declare
  v_usuario_id uuid := auth.uid();
  v_original public.solicitudes%rowtype;
  v_en_curso bigint;
  v_solicitud_id uuid;
  v_numero bigint;
  v_resultado jsonb;
begin
  if p_idempotencia_clave is not null then
    select resultado into v_resultado
    from public.idempotencia_claves where clave = p_idempotencia_clave;
    if v_resultado is not null then
      return v_resultado;
    end if;
  end if;

  if v_usuario_id is null then
    raise exception 'La sesión no es válida';
  end if;
  if not (
    public.tiene_rol('cliente', v_usuario_id) or public.tiene_rol('solicitante', v_usuario_id)
  ) then
    raise exception 'El usuario no tiene permiso para aplicar garantías';
  end if;
  if length(trim(coalesce(p_detalle, ''))) < 10 then
    raise exception 'Describa la falla en al menos 10 caracteres';
  end if;

  select * into v_original
  from public.solicitudes
  where id = p_solicitud_original_id
  for update;
  if not found or v_original.cliente_id is distinct from public.cliente_del_usuario(v_usuario_id) then
    raise exception 'La solicitud no existe o no pertenece a su organización';
  end if;
  if v_original.estado <> 'cerrada' then
    raise exception 'La garantía solo se puede aplicar sobre una solicitud cerrada';
  end if;
  if v_original.garantia_vence_en is null or v_original.garantia_vence_en < now() then
    raise exception 'La garantía de la solicitud #% no está vigente', v_original.numero;
  end if;

  select numero into v_en_curso
  from public.solicitudes
  where solicitud_original_id = v_original.id
    and estado not in ('cerrada', 'cancelada', 'rechazada')
  limit 1;
  if v_en_curso is not null then
    raise exception 'Ya hay una solicitud de garantía en curso para la solicitud #%: #%',
      v_original.numero, v_en_curso;
  end if;

  if not exists (
    select 1 from public.ubicaciones
    where id = v_original.ubicacion_id and cliente_id = v_original.cliente_id and activa
  ) then
    raise exception 'La ubicación de la solicitud original ya no está activa; contacte al proveedor';
  end if;

  insert into public.solicitudes (
    nombre, tipo_solicitud_id, detalle, cliente_id, ubicacion_id, solicitante_id,
    equipo_id, solicitud_original_id
  ) values (
    'Garantía de #' || v_original.numero || ' · ' || v_original.nombre,
    v_original.tipo_solicitud_id, trim(p_detalle), v_original.cliente_id,
    v_original.ubicacion_id, v_usuario_id, v_original.equipo_id, v_original.id
  )
  returning id, numero into v_solicitud_id, v_numero;

  -- Seguimiento de la solicitud original: la interacción de garantía ya dispara su propio
  -- registro ('Atención por garantía solicitada') vía tracking_garantia_solicitud.
  insert into public.solicitud_garantia_interacciones (solicitud_id, tipo, detalle, creado_por)
  values (
    v_original.id, 'solicitud_atencion',
    'Se abrió la solicitud de garantía #' || v_numero || ': ' || trim(p_detalle),
    v_usuario_id
  );

  -- Seguimiento de la solicitud nueva: de qué trabajo es garantía.
  perform public.registrar_actividad_solicitud(
    v_solicitud_id, 'garantia', 'Solicitud de garantía',
    'Garantía de la solicitud #' || v_original.numero || ' · ' || v_original.nombre,
    v_usuario_id, 'solicitudes', v_original.id::text,
    jsonb_build_object('solicitud_original_id', v_original.id, 'numero_original', v_original.numero),
    now()
  );

  insert into public.notificaciones_internas (tipo, titulo, mensaje, entidad_tipo, entidad_id)
  values (
    'cliente',
    'Garantía aplicada sobre la solicitud #' || v_original.numero,
    'Nueva solicitud de garantía #' || v_numero || ' — ' || trim(p_detalle),
    'solicitud', v_solicitud_id::text
  );

  v_resultado := jsonb_build_object('id', v_solicitud_id, 'numero', v_numero);
  if p_idempotencia_clave is not null then
    insert into public.idempotencia_claves (clave, usuario_id, operacion, resultado)
    values (p_idempotencia_clave, v_usuario_id, 'aplicar_garantia', v_resultado)
    on conflict (clave) do nothing;
  end if;
  return v_resultado;
end;
$$;

revoke all on function public.aplicar_garantia_solicitud(uuid, text, uuid) from public;
grant execute on function public.aplicar_garantia_solicitud(uuid, text, uuid) to authenticated;
