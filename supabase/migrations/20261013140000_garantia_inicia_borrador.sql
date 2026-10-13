-- La garantía nace como borrador del Cliente ("creada"): queda enlazada a la solicitud original,
-- el Cliente puede revisarla o modificarla y la envía como cualquier otra. El registro en el
-- seguimiento de la solicitud original y el aviso interno al proveedor pasan al momento del envío,
-- para que el proveedor no vea una garantía que el Cliente todavía no ha enviado.

-- 1. Estado inicial: solo lo que crea un gestor nace enviado (antes también las garantías).
create or replace function public.estado_inicial_solicitud()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.estado = 'creada' and public.es_gestor(auth.uid()) then
    new.estado := 'enviada';
  end if;
  if new.estado = 'enviada' then
    new.enviada_en := coalesce(new.enviada_en, now());
  end if;
  return new;
end $$;

-- 2. Aplicar garantía: crea el borrador enlazado; ya no avisa al proveedor ni toca la original.
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

  -- Un borrador de garantía también cuenta como "en curso": una sola a la vez por solicitud.
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

  -- Seguimiento del borrador (solo lo ve el Cliente mientras no lo envíe).
  perform public.registrar_actividad_solicitud(
    v_solicitud_id, 'garantia', 'Solicitud de garantía',
    'Garantía de la solicitud #' || v_original.numero || ' · ' || v_original.nombre,
    v_usuario_id, 'solicitudes', v_original.id::text,
    jsonb_build_object('solicitud_original_id', v_original.id, 'numero_original', v_original.numero),
    now()
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

-- 3. Enviar: si es una garantía, ahora sí queda en el seguimiento de la original y se avisa.
create or replace function public.enviar_solicitud(p_solicitud_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_solicitud public.solicitudes%rowtype;
  v_numero_original bigint;
begin
  if auth.uid() is null then raise exception 'La sesión no es válida'; end if;
  select * into v_solicitud from public.solicitudes where id = p_solicitud_id for update;
  if not found or not public.es_duenio_borrador(v_solicitud) then
    raise exception 'La solicitud no existe o no pertenece a su organización';
  end if;
  if v_solicitud.estado <> 'creada' then
    raise exception 'La solicitud #% ya fue enviada', v_solicitud.numero;
  end if;
  update public.solicitudes set estado = 'enviada' where id = p_solicitud_id;

  if v_solicitud.solicitud_original_id is not null then
    select numero into v_numero_original
    from public.solicitudes where id = v_solicitud.solicitud_original_id;
    -- La interacción de garantía registra su propia actividad ('Atención por garantía
    -- solicitada') en la solicitud original vía tracking_garantia_solicitud.
    insert into public.solicitud_garantia_interacciones (solicitud_id, tipo, detalle, creado_por)
    values (
      v_solicitud.solicitud_original_id, 'solicitud_atencion',
      'Se envió la solicitud de garantía #' || v_solicitud.numero || ': ' || v_solicitud.detalle,
      auth.uid()
    );
    insert into public.notificaciones_internas (tipo, titulo, mensaje, entidad_tipo, entidad_id)
    values (
      'cliente',
      'Garantía aplicada sobre la solicitud #' || v_numero_original,
      'Nueva solicitud de garantía #' || v_solicitud.numero || ' — ' || v_solicitud.detalle,
      'solicitud', p_solicitud_id::text
    );
  end if;
end $$;
