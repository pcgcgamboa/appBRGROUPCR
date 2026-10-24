-- 1. Configuración → General: interruptor de recomendaciones con IA (Gemini, Edge Function
--    recomendar-ia). Apagado, la función responde "deshabilitada" y la interfaz deja solo las
--    sugerencias por reglas. Misma fila única y mismas políticas de configuracion_operativa
--    (lectura para autenticados, cambio solo administrador).
alter table public.configuracion_operativa
  add column if not exists ia_recomendaciones_activa boolean not null default true,
  -- Tiempo máximo de una consulta a la IA: pasado este plazo se cancela (navegador y servidor) y
  -- quedan las sugerencias por reglas.
  add column if not exists ia_tiempo_espera_segundos integer not null default 6
    check (ia_tiempo_espera_segundos between 2 and 60);

-- 2. "Devolver al Cliente" también desde "asignada" (el botón Rechazar se retiró del panel; la
--    devolución es ahora la forma de pedirle ajustes). Base: 20261023120000.
create or replace function public.transicion_estado_valida(
  anterior public.estado_solicitud,
  nuevo public.estado_solicitud
)
returns boolean language sql immutable set search_path = '' as $$
  select case anterior
    when 'creada' then nuevo in ('enviada', 'cancelada')
    when 'enviada' then nuevo in ('asignada', 'rechazada', 'cancelada', 'creada')
    when 'asignada' then nuevo in ('en_atencion', 'cancelada', 'creada')
    when 'en_atencion' then nuevo in ('en_espera_materiales', 'atendida', 'cancelada', 'asignada')
    when 'en_espera_materiales' then nuevo in ('en_atencion', 'atendida', 'cancelada')
    when 'atendida' then nuevo in ('cerrada', 'en_atencion', 'cancelada')
    when 'cerrada' then nuevo = 'asignada'
    else false
  end;
$$;

-- Un borrador del Cliente no tiene trabajo asignado: al devolverlo se retiran operador, fecha
-- programada y ruta (un borrador no se programa — ver programar_solicitud_semana), y el plazo
-- vuelve a correr cuando la reenvíe. Base: 20261023120000.
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
    elsif new.estado = 'creada' then
      -- Devuelta al Cliente (desde enviada o asignada).
      new.enviada_en = null;
      new.sla_vence_en = null;
      new.operador_id = null;
      delete from public.programacion_solicitudes where solicitud_id = new.id;
      delete from public.ruta_solicitudes where solicitud_id = new.id;
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

-- La actividad visible distingue la devolución desde cualquiera de los dos estados.
create or replace function public.tracking_estado_solicitud()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform public.registrar_actividad_solicitud(
    new.solicitud_id, 'estado',
    case
      when new.estado_anterior is null then 'Solicitud creada'
      when new.estado_nuevo = 'creada' then 'Devuelta al Cliente para ajustes'
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
