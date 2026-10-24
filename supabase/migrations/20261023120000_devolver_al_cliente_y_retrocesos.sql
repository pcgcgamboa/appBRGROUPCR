-- Flujo de estados con retrocesos y "Devolver al Cliente":
--   - enviada → creada: el proveedor devuelve la solicitud al borrador del Cliente para que la
--     ajuste (motivo obligatorio, validado en gestionar-solicitud) y la vuelva a enviar. El SLA corre
--     desde el envío, así que se limpian enviada_en y sla_vence_en; al reenviarla se recalculan y
--     vuelve a salir el aviso interno de "solicitud nueva".
--   - en_atencion → asignada: deshacer un inicio de atención registrado por error.
-- El motivo (motivo_rechazo_cancelacion) pasa ahora también al historial de estados como comentario,
-- y la actividad "Estado actualizado" que ve el Cliente lo incluye: así sabe qué debe ajustar.

-- 1. Transiciones válidas (base: 20261013120100_flujo_solicitud_enviada.sql).
create or replace function public.transicion_estado_valida(
  anterior public.estado_solicitud,
  nuevo public.estado_solicitud
)
returns boolean language sql immutable set search_path = '' as $$
  select case anterior
    when 'creada' then nuevo in ('enviada', 'cancelada')
    when 'enviada' then nuevo in ('asignada', 'rechazada', 'cancelada', 'creada')
    when 'asignada' then nuevo in ('en_atencion', 'cancelada')
    when 'en_atencion' then nuevo in ('en_espera_materiales', 'atendida', 'cancelada', 'asignada')
    when 'en_espera_materiales' then nuevo in ('en_atencion', 'atendida', 'cancelada')
    when 'atendida' then nuevo in ('cerrada', 'en_atencion', 'cancelada')
    when 'cerrada' then nuevo = 'asignada'
    else false
  end;
$$;

-- 2. Reglas de cambio (base: 20261013120100_flujo_solicitud_enviada.sql) + efectos de los
--    movimientos nuevos.
create or replace function public.validar_cambio_solicitud()
returns trigger
language plpgsql
security definer
set search_path = '' as $$
begin
  if old.estado = 'creada' and not public.es_duenio_borrador(old) then
    raise exception 'La solicitud #% es un borrador del Cliente: no puede modificarse hasta que la envíe',
      old.numero;
  end if;

  if new.estado <> old.estado then
    if not public.transicion_estado_valida(old.estado, new.estado) then
      raise exception 'Transición de estado no permitida: % -> %', old.estado, new.estado;
    end if;

    if old.estado = 'cerrada' and new.estado = 'asignada' then
      new.reabierta_en = now();
      new.cerrada_en = null;
    elsif old.estado = 'enviada' and new.estado = 'creada' then
      -- Devuelta al Cliente: el plazo vuelve a correr cuando la reenvíe.
      new.enviada_en = null;
      new.sla_vence_en = null;
    elsif new.estado = 'enviada' then
      new.enviada_en = coalesce(new.enviada_en, now());
      -- Reenviada tras una devolución: el motivo ya se atendió.
      if old.estado = 'creada' then
        new.motivo_rechazo_cancelacion = null;
      end if;
    elsif new.estado = 'atendida' then
      new.atendida_en = now();
    elsif new.estado = 'cerrada' then
      new.cerrada_en = now();
    end if;
  end if;

  return new;
end;
$$;

-- 3. Historial: guarda el motivo de cancelación, rechazo o devolución como comentario
--    (base: 20260810230200_reglas_solicitudes.sql).
create or replace function public.auditar_estado_solicitud()
returns trigger
language plpgsql
security definer
set search_path = '' as $$
begin
  if tg_op = 'INSERT' or new.estado <> old.estado then
    insert into public.solicitud_estados_historial (
      solicitud_id, estado_anterior, estado_nuevo, cambiado_por, comentario
    ) values (
      new.id,
      case when tg_op = 'UPDATE' then old.estado else null end,
      new.estado,
      auth.uid(),
      case
        when tg_op = 'UPDATE' and new.estado in ('cancelada', 'rechazada', 'creada')
          then nullif(trim(new.motivo_rechazo_cancelacion), '')
      end
    );
  end if;
  return new;
end;
$$;

-- 4. Actividad visible: la descripción incluye el comentario cuando existe
--    (base: 20260821100000_tracking_solicitudes.sql).
create or replace function public.tracking_estado_solicitud()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform public.registrar_actividad_solicitud(
    new.solicitud_id, 'estado',
    case
      when new.estado_anterior is null then 'Solicitud creada'
      when new.estado_anterior = 'enviada' and new.estado_nuevo = 'creada' then 'Devuelta al Cliente para ajustes'
      else 'Estado actualizado'
    end,
    case when new.estado_anterior is null then 'Estado inicial: ' || replace(new.estado_nuevo::text, '_', ' ')
      else replace(new.estado_anterior::text, '_', ' ') || ' → ' || replace(new.estado_nuevo::text, '_', ' ') end
      || coalesce(' — ' || new.comentario, ''),
    new.cambiado_por, 'solicitud_estados_historial', new.id::text,
    jsonb_build_object('estado_anterior', new.estado_anterior, 'estado_nuevo', new.estado_nuevo,
      'comentario', new.comentario), new.creado_en
  );
  return new;
end $$;
