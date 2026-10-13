-- Flujo con borrador: "creada" es el borrador del Cliente (solo él lo ve y lo modifica); al pulsar
-- "Enviar" pasa a "enviada" y recién entonces el proveedor puede trabajarla (asignar, rechazar,
-- cancelar, editar). El SLA corre desde el envío, no desde la creación del borrador.
--
--   creada  -> enviada (el Cliente envía) | cancelada
--   enviada -> asignada | rechazada | cancelada            (proveedor)
--   (el resto del flujo no cambia)

-- 1. Momento del envío: base del SLA.
alter table public.solicitudes add column if not exists enviada_en timestamptz;

-- 2. La prioridad la define el proveedor después del envío: una solicitud enviada puede no tenerla.
do $$
declare v_nombre text;
begin
  select conname into v_nombre
  from pg_constraint
  where conrelid = 'public.solicitudes'::regclass and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%prioridad IS NOT NULL%';
  if v_nombre is not null then
    execute format('alter table public.solicitudes drop constraint %I', v_nombre);
  end if;
end $$;
alter table public.solicitudes add constraint solicitudes_prioridad_requerida_check
  check (estado in ('creada', 'enviada', 'rechazada', 'cancelada') or prioridad is not null);

-- 3. Transiciones.
create or replace function public.transicion_estado_valida(
  anterior public.estado_solicitud,
  nuevo public.estado_solicitud
)
returns boolean language sql immutable set search_path = '' as $$
  select case anterior
    when 'creada' then nuevo in ('enviada', 'cancelada')
    when 'enviada' then nuevo in ('asignada', 'rechazada', 'cancelada')
    when 'asignada' then nuevo in ('en_atencion', 'cancelada')
    when 'en_atencion' then nuevo in ('en_espera_materiales', 'atendida', 'cancelada')
    when 'en_espera_materiales' then nuevo in ('en_atencion', 'atendida', 'cancelada')
    when 'atendida' then nuevo in ('cerrada', 'en_atencion', 'cancelada')
    when 'cerrada' then nuevo = 'asignada'
    else false
  end;
$$;

-- ¿El usuario actual es dueño del borrador? (quien lo creó, o un usuario de portal de la misma
-- organización). auth.uid() nulo = migraciones/procesos internos.
create or replace function public.es_duenio_borrador(p_solicitud public.solicitudes)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is null
    or p_solicitud.solicitante_id = auth.uid()
    or (
      p_solicitud.cliente_id = public.cliente_del_usuario()
      and (public.tiene_rol('cliente') or public.tiene_rol('solicitante'))
    );
$$;

-- 4. Reglas de cambio: además de la transición válida, un borrador solo lo toca su dueño (el
--    proveedor no puede asignarlo, editarlo ni enviarlo en nombre del Cliente).
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
    elsif new.estado = 'enviada' then
      new.enviada_en = coalesce(new.enviada_en, now());
    elsif new.estado = 'atendida' then
      new.atendida_en = now();
    elsif new.estado = 'cerrada' then
      new.cerrada_en = now();
    end if;
  end if;

  return new;
end;
$$;

-- 5. Datos existentes: bajo el modelo anterior una solicitud "creada" ya era visible y trabajable
--    por el proveedor, así que pasa a "enviada" (conservando la fecha de creación como envío para
--    no mover su SLA). El resto toma su creación como fecha de envío.
update public.solicitudes set enviada_en = creado_en where enviada_en is null and estado <> 'creada';
update public.solicitudes set estado = 'enviada', enviada_en = creado_en where estado = 'creada';

-- 6. Estado inicial: el borrador es del portal del Cliente. Lo que crea un gestor, y las garantías
--    (el Cliente ya expresó su intención al aplicarla), nacen enviadas.
create or replace function public.estado_inicial_solicitud()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.estado = 'creada'
    and (new.solicitud_original_id is not null or public.es_gestor(auth.uid())) then
    new.estado := 'enviada';
  end if;
  if new.estado = 'enviada' then
    new.enviada_en := coalesce(new.enviada_en, now());
  end if;
  return new;
end $$;
drop trigger if exists estado_inicial_solicitud on public.solicitudes;
create trigger estado_inicial_solicitud before insert on public.solicitudes
for each row execute function public.estado_inicial_solicitud();

-- 7. El aviso interno de "solicitud nueva" sale cuando llega al proveedor (al enviarse), no al
--    guardar el borrador.
create or replace function public.avisar_solicitud_nueva()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_correo text;
  v_cliente text;
begin
  if new.estado <> 'enviada' or (tg_op = 'UPDATE' and old.estado = 'enviada') then
    return new;
  end if;
  select correo_soporte into v_correo from public.configuracion_correo where id = true;
  if v_correo is null then
    return new;
  end if;
  select nombre into v_cliente from public.clientes where id = new.cliente_id;
  insert into public.notificaciones_envios (tipo, solicitud_id, destinatario, resultado, asunto, cuerpo_texto)
  values (
    'aviso_interno',
    new.id,
    v_correo,
    'pendiente',
    concat('Nueva solicitud #', new.numero, ': ', new.nombre),
    concat('Se recibió la solicitud #', new.numero, ' (', new.nombre, ') del cliente ', coalesce(v_cliente, '—'), '.')
  );
  return new;
end $$;
drop trigger if exists avisar_solicitud_nueva on public.solicitudes;
create trigger avisar_solicitud_nueva after insert or update of estado on public.solicitudes
for each row execute function public.avisar_solicitud_nueva();

-- 8. Portal del Cliente: enviar el borrador.
create or replace function public.enviar_solicitud(p_solicitud_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_solicitud public.solicitudes%rowtype;
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
end $$;
revoke all on function public.enviar_solicitud(uuid) from public;
grant execute on function public.enviar_solicitud(uuid) to authenticated;

-- 9. Portal del Cliente: modificar el borrador (solo mientras está en "creada").
create or replace function public.editar_solicitud_borrador(
  p_solicitud_id uuid,
  p_nombre text,
  p_tipo_solicitud_id uuid,
  p_ubicacion_id uuid,
  p_detalle text,
  p_equipo_id uuid default null
)
returns void language plpgsql security definer set search_path = '' as $$
declare v_solicitud public.solicitudes%rowtype;
begin
  if auth.uid() is null then raise exception 'La sesión no es válida'; end if;
  select * into v_solicitud from public.solicitudes where id = p_solicitud_id for update;
  if not found or not public.es_duenio_borrador(v_solicitud) then
    raise exception 'La solicitud no existe o no pertenece a su organización';
  end if;
  if v_solicitud.estado <> 'creada' then
    raise exception 'La solicitud #% ya fue enviada y no puede modificarse', v_solicitud.numero;
  end if;
  if length(trim(coalesce(p_nombre, ''))) < 3 or length(trim(coalesce(p_detalle, ''))) < 10 then
    raise exception 'Indique un nombre (3+ caracteres) y un detalle (10+ caracteres)';
  end if;
  if not exists (select 1 from public.tipos_solicitud where id = p_tipo_solicitud_id and activo) then
    raise exception 'El tipo de solicitud no está disponible';
  end if;
  if not exists (
    select 1 from public.ubicaciones
    where id = p_ubicacion_id and cliente_id = v_solicitud.cliente_id and activa
  ) then
    raise exception 'La ubicación no pertenece al cliente o está inactiva';
  end if;
  if p_equipo_id is not null and not exists (
    select 1 from public.equipos_cliente where id = p_equipo_id and cliente_id = v_solicitud.cliente_id
  ) then
    raise exception 'El equipo no pertenece al cliente';
  end if;
  update public.solicitudes
  set nombre = trim(p_nombre), tipo_solicitud_id = p_tipo_solicitud_id,
      ubicacion_id = p_ubicacion_id, detalle = trim(p_detalle), equipo_id = p_equipo_id
  where id = p_solicitud_id;
end $$;
revoke all on function public.editar_solicitud_borrador(uuid, text, uuid, uuid, text, uuid) from public;
grant execute on function public.editar_solicitud_borrador(uuid, text, uuid, uuid, text, uuid) to authenticated;

-- 10. Edición de datos generales por el gestor: el SLA se recalcula desde el envío.
create or replace function public.editar_datos_solicitud(
  p_solicitud_id uuid, p_nombre text, p_detalle text, p_cliente_id uuid,
  p_ubicacion_id uuid, p_tipo_solicitud_id uuid, p_prioridad public.prioridad_solicitud
) returns void language plpgsql security definer set search_path='' as $$
declare v_anterior public.solicitudes%rowtype; v_horas integer; v_nuevos jsonb;
begin
  if not public.es_gestor() then raise exception 'Solo Administradores y Encargados pueden editar los datos generales'; end if;
  select * into v_anterior from public.solicitudes where id=p_solicitud_id for update;
  if not found then raise exception 'Solicitud no encontrada'; end if;
  if v_anterior.estado = 'creada' then raise exception 'La solicitud es un borrador del Cliente: no puede editarse hasta que la envíe'; end if;
  if v_anterior.estado in ('cerrada','cancelada','rechazada') then raise exception 'No se pueden editar datos generales de una solicitud finalizada'; end if;
  if length(trim(p_nombre))=0 or length(trim(p_detalle))=0 then raise exception 'Nombre y detalle son obligatorios'; end if;
  if not exists(select 1 from public.clientes where id=p_cliente_id and activo) then raise exception 'Cliente inválido o inactivo'; end if;
  if not exists(select 1 from public.ubicaciones where id=p_ubicacion_id and cliente_id=p_cliente_id and activa) then raise exception 'La ubicación no pertenece al cliente'; end if;
  if not exists(select 1 from public.tipos_solicitud where id=p_tipo_solicitud_id and activo) then raise exception 'Tipo de solicitud inválido'; end if;
  if p_prioridad is not null then
    select horas into v_horas from public.tipo_solicitud_sla where tipo_solicitud_id=p_tipo_solicitud_id and prioridad=p_prioridad;
    if v_horas is null then raise exception 'No existe SLA para el tipo y prioridad seleccionados'; end if;
    if p_prioridad='urgente' then v_horas:=least(v_horas,24); end if;
  end if;
  update public.solicitudes set nombre=trim(p_nombre),detalle=trim(p_detalle),cliente_id=p_cliente_id,
    ubicacion_id=p_ubicacion_id,tipo_solicitud_id=p_tipo_solicitud_id,prioridad=p_prioridad,
    sla_horas=case when p_prioridad is null then null else v_horas end,
    sla_vence_en=case when p_prioridad is null then null
      else coalesce(v_anterior.enviada_en, v_anterior.creado_en)+(v_horas||' hours')::interval end
  where id=p_solicitud_id;
  v_nuevos:=jsonb_build_object('nombre',trim(p_nombre),'detalle',trim(p_detalle),'cliente_id',p_cliente_id,'ubicacion_id',p_ubicacion_id,'tipo_solicitud_id',p_tipo_solicitud_id,'prioridad',p_prioridad);
  insert into public.solicitud_ediciones_auditoria(solicitud_id,editado_por,datos_anteriores,datos_nuevos)
  values(p_solicitud_id,auth.uid(),jsonb_build_object('nombre',v_anterior.nombre,'detalle',v_anterior.detalle,'cliente_id',v_anterior.cliente_id,'ubicacion_id',v_anterior.ubicacion_id,'tipo_solicitud_id',v_anterior.tipo_solicitud_id,'prioridad',v_anterior.prioridad),v_nuevos);
end $$;

-- 11. Programación: un borrador no se programa.
create or replace function public.programar_solicitud_semana(
  p_solicitud_id uuid,
  p_fecha date
) returns void language plpgsql set search_path = '' as $$
begin
  if not public.es_gestor() then
    raise exception 'Solo administradores y encargados pueden programar solicitudes';
  end if;
  if not exists (
    select 1 from public.solicitudes
    where id = p_solicitud_id
      and estado not in ('creada', 'cerrada', 'cancelada', 'rechazada')
  ) then
    raise exception 'La solicitud no está disponible para programación';
  end if;
  insert into public.programacion_solicitudes(
    solicitud_id, fecha_programada, programado_por
  ) values (p_solicitud_id, p_fecha, auth.uid())
  on conflict(solicitud_id) do update
  set fecha_programada = excluded.fecha_programada,
      programado_por = excluded.programado_por;
end $$;

-- 12. Panorama: los borradores del Cliente no cuentan como solicitudes recibidas.
create or replace function public.obtener_dashboard_solicitudes()
returns jsonb
language plpgsql
stable
security invoker
set search_path = '' as $$
declare
  v_resultado jsonb;
begin
  if not public.es_gestor() then
    raise exception 'Solo Administradores y Encargados pueden consultar reportes';
  end if;

  select jsonb_build_object(
    'totales', jsonb_build_object(
      'total', count(*),
      'activas', count(*) filter (where estado not in ('cerrada', 'cancelada', 'rechazada')),
      'urgentes', count(*) filter (where prioridad = 'urgente'),
      'sla_vencidas', count(*) filter (
        where sla_vence_en < now()
          and estado not in ('atendida', 'cerrada', 'cancelada', 'rechazada')
      )
    ),
    'por_estado', (
      select coalesce(jsonb_agg(jsonb_build_object('nombre', estado, 'cantidad', cantidad) order by estado), '[]'::jsonb)
      from (
        select estado::text, count(*) as cantidad
        from public.solicitudes where estado <> 'creada' group by estado
      ) datos_estado
    ),
    'por_prioridad', (
      select coalesce(jsonb_agg(jsonb_build_object('nombre', prioridad, 'cantidad', cantidad) order by orden), '[]'::jsonb)
      from (
        select coalesce(prioridad::text, 'sin_definir') as prioridad,
          count(*) as cantidad,
          min(case prioridad when 'urgente' then 1 when 'alta' then 2 when 'media' then 3 when 'baja' then 4 else 5 end) as orden
        from public.solicitudes where estado <> 'creada' group by prioridad
      ) datos_prioridad
    ),
    'por_urgencia', (
      select coalesce(jsonb_agg(jsonb_build_object('nombre', categoria, 'cantidad', cantidad) order by orden), '[]'::jsonb)
      from (
        select case
          when prioridad <> 'urgente' or prioridad is null then 'no_urgentes'
          when estado in ('atendida', 'cerrada', 'cancelada', 'rechazada') then 'urgentes_finalizadas'
          when sla_vence_en < now() then 'urgentes_vencidas'
          else 'urgentes_en_plazo'
        end as categoria,
        count(*) as cantidad,
        min(case
          when prioridad <> 'urgente' or prioridad is null then 4
          when estado in ('atendida', 'cerrada', 'cancelada', 'rechazada') then 3
          when sla_vence_en < now() then 1
          else 2
        end) as orden
        from public.solicitudes
        where estado <> 'creada'
        group by categoria
      ) datos_urgencia
    )
  ) into v_resultado
  from public.solicitudes
  where estado <> 'creada';

  return v_resultado;
end;
$$;
