-- Enlaza automatizacion_ejecuciones.correlacion_id con la solicitud HTTP real que originó el
-- cambio, para las 4 acciones de gestionar-solicitud (asignar, rechazar, reabrir, cambiar_estado)
-- — la fuente más frecuente de automatizaciones sobre `solicitudes`. Mecanismo: la Edge Function
-- incluye `correlacion_id_operacion` en el mismo UPDATE que ya hace sobre `solicitudes`; el
-- trigger BEFORE `validar_cambio_solicitud` y el trigger AFTER `trazar_automatizaciones_solicitud`
-- disparan sobre esa MISMA sentencia, así que ambos ven el valor sin necesidad de `set_config` de
-- sesión (que no es confiable con el connection pooling de Supabase — ver
-- docs/informe-arquitectura-fase-2.md sección 5). No cubre avances (`registrar_avance_operador`)
-- ni notificaciones (`notificaciones_envios`) todavía — queda documentado como alcance pendiente.

alter table public.solicitudes add column correlacion_id_operacion uuid;

comment on column public.solicitudes.correlacion_id_operacion is
  'Identificador de la invocación HTTP que originó el último UPDATE, para correlacionar con automatizacion_ejecuciones. Transitorio: solo se usa cuando cambia respecto al valor anterior (ver trazar_automatizaciones_solicitud); no se limpia entre updates.';

-- Se agrega p_correlacion_id al final (default null) para no duplicar el punto de inserción de
-- automatizacion_ejecuciones que ya usan trazar_odometro_automatico y trazar_notificacion_automatica.
-- `create or replace` no basta: cambiar la lista de parámetros crea una sobrecarga nueva en vez de
-- reemplazar la existente (misma razón documentada en 20260822130000_idempotencia_mutaciones_criticas.sql),
-- así que se elimina la función vieja explícitamente antes de recrearla.
drop function if exists public.registrar_ejecucion_automatica(
  text, text, text, text, text, text, uuid, uuid, text, text, jsonb, jsonb, uuid, timestamptz
);

create function public.registrar_ejecucion_automatica(
  p_regla text, p_origen text, p_motivo text, p_accion text, p_resultado text, p_detalle text,
  p_solicitud_id uuid default null, p_ruta_id uuid default null, p_entidad_tipo text default null,
  p_entidad_id text default null, p_entradas jsonb default '{}'::jsonb, p_salidas jsonb default '{}'::jsonb,
  p_actor uuid default null, p_fecha timestamptz default now(), p_correlacion_id uuid default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  insert into public.automatizacion_ejecuciones(
    correlacion_id, regla, origen, solicitud_id, ruta_id, entidad_tipo, entidad_id, motivo, accion,
    resultado, detalle_resultado, entradas, salidas, ejecutado_por, iniciado_en, finalizado_en
  ) values(
    coalesce(p_correlacion_id, gen_random_uuid()), p_regla, p_origen, p_solicitud_id, p_ruta_id,
    p_entidad_tipo, p_entidad_id, p_motivo, p_accion, p_resultado, p_detalle,
    coalesce(p_entradas, '{}'::jsonb), coalesce(p_salidas, '{}'::jsonb),
    coalesce(p_actor, auth.uid()), coalesce(p_fecha, now()), coalesce(p_fecha, now())
  ) returning id into v_id;
  return v_id;
end $$;

revoke all on function public.registrar_ejecucion_automatica(
  text, text, text, text, text, text, uuid, uuid, text, text, jsonb, jsonb, uuid, timestamptz, uuid
) from public;

-- registrar_ejecucion_automatica solo la llaman funciones `security definer` (los triggers de
-- trazabilidad), nunca directamente desde el cliente — sin grant a `authenticated`, igual que
-- antes.

create or replace function public.trazar_automatizaciones_solicitud()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_id uuid; v_regla text; v_motivo text; v_accion text; v_detalle text; v_entradas jsonb; v_salidas jsonb;
  v_correlacion_id uuid;
begin
  if new.sla_vence_en is distinct from old.sla_vence_en then
    v_regla:='calculo_sla';
    v_motivo:='El tipo o la prioridad de la solicitud requiere recalcular la fecha límite de atención.';
    v_accion:='Calcular el SLA desde la fecha original de creación usando las horas configuradas.';
    v_detalle:='SLA establecido correctamente en ' || coalesce(new.sla_vence_en::text,'sin fecha límite') || '.';
    v_entradas:=jsonb_build_object('prioridad',new.prioridad,'sla_horas',new.sla_horas,'creado_en',new.creado_en);
    v_salidas:=jsonb_build_object('sla_vence_en',new.sla_vence_en);
  elsif new.atendida_en is distinct from old.atendida_en and new.atendida_en is not null then
    v_regla:='marca_atencion'; v_motivo:='La solicitud cambió al estado atendida.';
    v_accion:='Registrar automáticamente la fecha de atención.';
    v_detalle:='Fecha de atención registrada correctamente.';
    v_entradas:=jsonb_build_object('estado_anterior',old.estado,'estado_nuevo',new.estado);
    v_salidas:=jsonb_build_object('atendida_en',new.atendida_en);
  elsif new.cerrada_en is distinct from old.cerrada_en then
    v_regla:='marca_cierre_reapertura';
    v_motivo:=case when new.cerrada_en is null then 'La solicitud fue reabierta.' else 'La solicitud cambió al estado cerrada después de la validación.' end;
    v_accion:=case when new.cerrada_en is null then 'Limpiar la fecha de cierre y marcar la reapertura.' else 'Registrar automáticamente la fecha de cierre.' end;
    v_detalle:='Marcas de tiempo actualizadas correctamente.';
    v_entradas:=jsonb_build_object('estado_anterior',old.estado,'estado_nuevo',new.estado);
    v_salidas:=jsonb_build_object('cerrada_en',new.cerrada_en,'reabierta_en',new.reabierta_en);
  else return new;
  end if;

  -- Solo se confía en correlacion_id_operacion si esta misma sentencia lo cambió; si quedó igual
  -- al valor anterior, no fue esta invocación la que lo fijó (evita reutilizar por error el id de
  -- un UPDATE previo que haya dejado la columna sin tocar).
  if new.correlacion_id_operacion is distinct from old.correlacion_id_operacion
     and new.correlacion_id_operacion is not null then
    v_correlacion_id := new.correlacion_id_operacion;
  else
    v_correlacion_id := null;
  end if;

  v_id:=public.registrar_ejecucion_automatica(v_regla,'trigger:validar_cambio_solicitud',v_motivo,v_accion,
    'exitoso',v_detalle,new.id,null,'solicitudes',new.id::text,v_entradas,v_salidas,auth.uid(),now(),v_correlacion_id);
  perform public.registrar_actividad_solicitud(new.id,'automatizacion','Automatización: ' || replace(v_regla,'_',' '),
    'Por qué: ' || v_motivo || E'\nAcción: ' || v_accion || E'\nResultado: ' || v_detalle,
    auth.uid(),'automatizacion_ejecuciones',v_id::text,
    jsonb_build_object('regla',v_regla,'motivo',v_motivo,'accion',v_accion,'resultado','exitoso'),now());
  return new;
end $$;
