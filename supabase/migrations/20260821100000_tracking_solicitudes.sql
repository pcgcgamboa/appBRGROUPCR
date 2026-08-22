-- Bitácora unificada e inmutable de la solicitud.
create table public.solicitud_actividades (
  id bigint generated always as identity primary key,
  solicitud_id uuid not null references public.solicitudes(id) on delete cascade,
  tipo text not null,
  titulo text not null,
  descripcion text,
  actor_id uuid references public.usuarios(id) on delete set null,
  entidad_tipo text,
  entidad_id text,
  datos jsonb not null default '{}'::jsonb,
  creado_en timestamptz not null default now()
);

create index solicitud_actividades_solicitud_idx
  on public.solicitud_actividades (solicitud_id, creado_en desc, id desc);
alter table public.solicitud_actividades enable row level security;
create policy solicitud_actividades_lectura on public.solicitud_actividades
for select to authenticated using (public.puede_ver_solicitud(solicitud_id));
grant select on public.solicitud_actividades to authenticated;
revoke insert, update, delete on public.solicitud_actividades from authenticated;

create or replace function public.registrar_actividad_solicitud(
  p_solicitud_id uuid, p_tipo text, p_titulo text, p_descripcion text,
  p_actor_id uuid, p_entidad_tipo text, p_entidad_id text, p_datos jsonb,
  p_creado_en timestamptz
) returns void language plpgsql security definer set search_path = '' as $$
begin
  insert into public.solicitud_actividades (
    solicitud_id, tipo, titulo, descripcion, actor_id, entidad_tipo, entidad_id, datos, creado_en
  ) values (
    p_solicitud_id, p_tipo, p_titulo, nullif(trim(p_descripcion), ''),
    coalesce(p_actor_id, auth.uid()), p_entidad_tipo, p_entidad_id,
    coalesce(p_datos, '{}'::jsonb), coalesce(p_creado_en, now())
  );
end;
$$;
revoke all on function public.registrar_actividad_solicitud(uuid,text,text,text,uuid,text,text,jsonb,timestamptz) from public;

create or replace function public.tracking_estado_solicitud()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform public.registrar_actividad_solicitud(
    new.solicitud_id, 'estado',
    case when new.estado_anterior is null then 'Solicitud creada' else 'Estado actualizado' end,
    case when new.estado_anterior is null then 'Estado inicial: ' || replace(new.estado_nuevo::text, '_', ' ')
      else replace(new.estado_anterior::text, '_', ' ') || ' → ' || replace(new.estado_nuevo::text, '_', ' ') end,
    new.cambiado_por, 'solicitud_estados_historial', new.id::text,
    jsonb_build_object('estado_anterior', new.estado_anterior, 'estado_nuevo', new.estado_nuevo,
      'comentario', new.comentario), new.creado_en
  );
  return new;
end $$;
create trigger tracking_estado_solicitud after insert on public.solicitud_estados_historial
for each row execute function public.tracking_estado_solicitud();

create or replace function public.tracking_solicitud_actualizada()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_nombre text;
begin
  if new.operador_id is distinct from old.operador_id then
    select nombre_completo into v_nombre from public.usuarios where id = new.operador_id;
    perform public.registrar_actividad_solicitud(
      new.id, 'asignacion',
      case when old.operador_id is null then 'Operador asignado'
        when new.operador_id is null then 'Operador retirado' else 'Operador reasignado' end,
      coalesce(v_nombre, 'Sin operador'), auth.uid(), 'solicitudes', new.id::text,
      jsonb_build_object('operador_anterior_id', old.operador_id, 'operador_nuevo_id', new.operador_id), now()
    );
  end if;
  return new;
end $$;
create trigger tracking_solicitud_actualizada after update of operador_id on public.solicitudes
for each row execute function public.tracking_solicitud_actualizada();

create or replace function public.tracking_edicion_solicitud()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform public.registrar_actividad_solicitud(
    new.solicitud_id, 'edicion', 'Datos generales actualizados', null,
    new.editado_por, 'solicitud_ediciones_auditoria', new.id::text,
    jsonb_build_object('anteriores', new.datos_anteriores, 'nuevos', new.datos_nuevos), new.creado_en
  );
  return new;
end $$;
create trigger tracking_edicion_solicitud after insert on public.solicitud_ediciones_auditoria
for each row execute function public.tracking_edicion_solicitud();

create or replace function public.tracking_avance_solicitud()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform public.registrar_actividad_solicitud(
    new.solicitud_id, 'avance', 'Avance actualizado',
    new.porcentaje || '% · ' || new.horas_trabajadas || ' h — ' || new.narrativa,
    new.operador_id, 'avances', new.id::text,
    jsonb_build_object('porcentaje', new.porcentaje, 'horas_trabajadas', new.horas_trabajadas,
      'vehiculo_id', new.vehiculo_id), new.creado_en
  );
  return new;
end $$;
create trigger tracking_avance_solicitud after insert on public.avances
for each row execute function public.tracking_avance_solicitud();

create or replace function public.tracking_material_solicitud()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_nombre text; v_unidad text;
begin
  select nombre, unidad_medida into v_nombre, v_unidad from public.materiales where id = new.material_id;
  perform public.registrar_actividad_solicitud(
    new.solicitud_id, 'material', 'Material registrado',
    new.cantidad || ' ' || coalesce(v_unidad, '') || ' · ' || coalesce(v_nombre, 'Material'),
    new.registrado_por, 'solicitud_materiales', new.id::text,
    jsonb_build_object('material_id', new.material_id, 'cantidad', new.cantidad,
      'costo', new.costo_referencial_aplicado), new.creado_en
  );
  return new;
end $$;
create trigger tracking_material_solicitud after insert on public.solicitud_materiales
for each row execute function public.tracking_material_solicitud();

create or replace function public.tracking_adjunto_solicitud()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform public.registrar_actividad_solicitud(
    new.solicitud_id, 'adjunto', 'Adjunto agregado', new.nombre_archivo,
    new.subido_por, 'adjuntos', new.id::text,
    jsonb_build_object('tipo', new.tipo, 'mime_type', new.mime_type,
      'tamano_bytes', new.tamano_bytes), new.creado_en
  );
  return new;
end $$;
create trigger tracking_adjunto_solicitud after insert on public.adjuntos
for each row execute function public.tracking_adjunto_solicitud();

create or replace function public.tracking_tecnico_solicitud()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_solicitud uuid; v_tecnico uuid; v_actor uuid; v_fecha timestamptz; v_nombre text;
begin
  v_solicitud := case when tg_op = 'DELETE' then old.solicitud_id else new.solicitud_id end;
  v_tecnico := case when tg_op = 'DELETE' then old.tecnico_id else new.tecnico_id end;
  v_actor := case when tg_op = 'DELETE' then auth.uid() else new.asignado_por end;
  v_fecha := case when tg_op = 'DELETE' then now() else new.asignado_en end;
  select nombre_completo into v_nombre from public.tecnicos where id = v_tecnico;
  perform public.registrar_actividad_solicitud(
    v_solicitud, 'tecnico', case when tg_op = 'DELETE' then 'Técnico retirado' else 'Técnico asignado' end,
    v_nombre, v_actor, 'solicitud_tecnicos', v_tecnico::text,
    jsonb_build_object('tecnico_id', v_tecnico, 'operacion', lower(tg_op)), v_fecha
  );
  return case when tg_op = 'DELETE' then old else new end;
end $$;
create trigger tracking_tecnico_solicitud after insert or delete on public.solicitud_tecnicos
for each row execute function public.tracking_tecnico_solicitud();

create or replace function public.tracking_validacion_solicitud()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform public.registrar_actividad_solicitud(
    new.solicitud_id, 'validacion', 'Cliente validó la atención',
    case when new.satisfecho then 'Cliente satisfecho' else 'Cliente no satisfecho' end ||
      case when new.comentario is null then '' else ' — ' || new.comentario end,
    new.cliente_usuario_id, 'validaciones_cierre', new.solicitud_id::text,
    jsonb_build_object('satisfecho', new.satisfecho), new.validado_en
  );
  return new;
end $$;
create trigger tracking_validacion_solicitud after insert on public.validaciones_cierre
for each row execute function public.tracking_validacion_solicitud();

create or replace function public.tracking_peticion_solicitud()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform public.registrar_actividad_solicitud(
    new.solicitud_id, 'peticion',
    case when tg_op = 'INSERT' then 'Petición de ' || new.tipo || ' creada'
      else 'Petición de ' || new.tipo || ' ' || new.estado end,
    case when tg_op = 'INSERT' then new.motivo else new.comentario_resolucion end,
    case when tg_op = 'INSERT' then new.solicitado_por else new.resuelto_por end,
    'solicitud_peticiones_resolucion', new.id::text,
    jsonb_build_object('tipo', new.tipo, 'estado', new.estado), coalesce(new.resuelto_en, new.creado_en)
  );
  return new;
end $$;
create trigger tracking_peticion_solicitud after insert or update of estado
on public.solicitud_peticiones_resolucion for each row execute function public.tracking_peticion_solicitud();

create or replace function public.tracking_ruta_solicitud()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_solicitud uuid; v_ruta uuid; v_orden integer; v_fecha timestamptz; v_codigo text;
begin
  v_solicitud := case when tg_op = 'DELETE' then old.solicitud_id else new.solicitud_id end;
  v_ruta := case when tg_op = 'DELETE' then old.ruta_id else new.ruta_id end;
  v_orden := case when tg_op = 'DELETE' then old.orden else new.orden end;
  v_fecha := case when tg_op = 'DELETE' then now() else new.agregado_en end;
  select codigo into v_codigo from public.rutas_proceso where id = v_ruta;
  perform public.registrar_actividad_solicitud(
    v_solicitud, 'ruta',
    case when tg_op = 'DELETE' then 'Solicitud retirada de ruta' else 'Solicitud agregada a ruta' end,
    v_codigo, auth.uid(), 'rutas_proceso', v_ruta::text,
    jsonb_build_object('ruta_id', v_ruta, 'orden', v_orden, 'operacion', lower(tg_op)), v_fecha
  );
  return case when tg_op = 'DELETE' then old else new end;
end $$;
create trigger tracking_ruta_solicitud after insert or delete on public.ruta_solicitudes
for each row execute function public.tracking_ruta_solicitud();

create or replace function public.tracking_movimiento_ruta()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_placa text; v_solicitud uuid;
begin
  select placa into v_placa from public.vehiculos where id = new.vehiculo_id;
  for v_solicitud in select solicitud_id from public.ruta_solicitudes where ruta_id = new.ruta_id loop
    perform public.registrar_actividad_solicitud(
      v_solicitud, 'movimiento_flota', 'Movimiento de vehículo',
      replace(new.tipo::text, '_', ' ') || ' · ' || coalesce(v_placa, 'Vehículo') ||
        case when new.cantidad is null then '' else ' · ' || new.cantidad || ' ' || coalesce(new.unidad, '') end ||
        case when new.monto > 0 then ' · ₡' || new.monto else '' end,
      new.registrado_por, 'ruta_movimientos_vehiculo', new.id::text,
      jsonb_build_object('ruta_id', new.ruta_id, 'vehiculo_id', new.vehiculo_id,
        'tipo', new.tipo, 'cantidad', new.cantidad, 'unidad', new.unidad,
        'monto', new.monto, 'detalle', new.detalle), new.creado_en
    );
  end loop;
  return new;
end $$;
create trigger tracking_movimiento_ruta after insert on public.ruta_movimientos_vehiculo
for each row execute function public.tracking_movimiento_ruta();

-- Recupera los estados y avances históricos ya existentes.
insert into public.solicitud_actividades
  (solicitud_id, tipo, titulo, descripcion, actor_id, entidad_tipo, entidad_id, datos, creado_en)
select h.solicitud_id, 'estado',
  case when h.estado_anterior is null then 'Solicitud creada' else 'Estado actualizado' end,
  case when h.estado_anterior is null then 'Estado inicial: ' || replace(h.estado_nuevo::text, '_', ' ')
    else replace(h.estado_anterior::text, '_', ' ') || ' → ' || replace(h.estado_nuevo::text, '_', ' ') end,
  h.cambiado_por, 'solicitud_estados_historial', h.id::text,
  jsonb_build_object('estado_anterior', h.estado_anterior, 'estado_nuevo', h.estado_nuevo,
    'comentario', h.comentario), h.creado_en
from public.solicitud_estados_historial h;

insert into public.solicitud_actividades
  (solicitud_id, tipo, titulo, descripcion, actor_id, entidad_tipo, entidad_id, datos, creado_en)
select a.solicitud_id, 'avance', 'Avance actualizado',
  a.porcentaje || '% · ' || a.horas_trabajadas || ' h — ' || a.narrativa,
  a.operador_id, 'avances', a.id::text,
  jsonb_build_object('porcentaje', a.porcentaje, 'horas_trabajadas', a.horas_trabajadas,
    'vehiculo_id', a.vehiculo_id), a.creado_en
from public.avances a;
