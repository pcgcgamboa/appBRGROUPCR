-- Participantes explícitos y viáticos individuales para rutas de proceso.
create table public.ruta_participantes (
  ruta_id uuid not null references public.rutas_proceso(id) on delete cascade,
  usuario_id uuid not null references public.usuarios(id) on delete restrict,
  viatico numeric(14, 2) not null default 0 check (viatico >= 0),
  detalle_viatico text,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  primary key (ruta_id, usuario_id),
  check (detalle_viatico is null or length(trim(detalle_viatico)) > 0)
);

create index ruta_participantes_usuario_idx
on public.ruta_participantes(usuario_id, ruta_id);

create trigger ruta_participantes_actualizado
before update on public.ruta_participantes
for each row execute function public.actualizar_marca_tiempo();

alter table public.ruta_participantes enable row level security;

create policy ruta_participantes_lectura
on public.ruta_participantes for select to authenticated
using (true);

create policy ruta_participantes_gestion
on public.ruta_participantes for all to authenticated
using (public.es_gestor())
with check (public.es_gestor());

grant select, insert, update, delete on public.ruta_participantes to authenticated;

comment on table public.ruta_participantes is
  'Personas involucradas en una ruta de proceso y viático definido individualmente.';
comment on column public.ruta_participantes.viatico is
  'Monto total de viático asignado a la persona para la ruta.';

-- Las rutas existentes conservan a su responsable como participante, sin viático inicial.
insert into public.ruta_participantes(ruta_id, usuario_id, viatico)
select id, responsable_id, 0
from public.rutas_proceso
on conflict (ruta_id, usuario_id) do nothing;

create or replace function public.tracking_ruta_participante()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ruta uuid;
  v_usuario uuid;
  v_nombre text;
  v_viatico numeric(14, 2);
begin
  v_ruta := case when tg_op = 'DELETE' then old.ruta_id else new.ruta_id end;
  v_usuario := case when tg_op = 'DELETE' then old.usuario_id else new.usuario_id end;
  v_viatico := case when tg_op = 'DELETE' then old.viatico else new.viatico end;

  select nombre_completo into v_nombre
  from public.usuarios
  where id = v_usuario;

  insert into public.ruta_actividades(
    ruta_id, tipo, titulo, descripcion, actor_id, datos
  ) values (
    v_ruta,
    'viatico',
    case
      when tg_op = 'INSERT' then 'Participante y viático agregados'
      when tg_op = 'DELETE' then 'Participante retirado'
      else 'Viático actualizado'
    end,
    coalesce(v_nombre, 'Usuario') || ' · ₡' || v_viatico ||
      coalesce(' — ' || case when tg_op = 'DELETE' then old.detalle_viatico else new.detalle_viatico end, ''),
    auth.uid(),
    jsonb_build_object(
      'usuario_id', v_usuario,
      'viatico', v_viatico,
      'detalle', case when tg_op = 'DELETE' then old.detalle_viatico else new.detalle_viatico end,
      'operacion', lower(tg_op)
    )
  );

  return case when tg_op = 'DELETE' then old else new end;
end
$$;

create trigger tracking_ruta_participante
  after insert or delete on public.ruta_participantes
  for each row execute function public.tracking_ruta_participante();

create trigger tracking_ruta_viatico_actualizado
  after update of viatico, detalle_viatico on public.ruta_participantes
  for each row
  when (
    old.viatico is distinct from new.viatico
    or old.detalle_viatico is distinct from new.detalle_viatico
  )
  execute function public.tracking_ruta_participante();

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
  p_participantes jsonb
) returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_id uuid;
  v_item uuid;
  v_orden integer := 0;
begin
  if not public.es_gestor() then
    raise exception 'Solo un administrador o encargado puede definir rutas';
  end if;
  if coalesce(array_length(p_solicitudes, 1), 0) = 0 then
    raise exception 'Incluya al menos una solicitud';
  end if;
  if coalesce(array_length(p_vehiculos, 1), 0) = 0 then
    raise exception 'Asocie al menos un vehículo';
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

  if p_id is null then
    insert into public.rutas_proceso(
      codigo, nombre, descripcion, fecha_programada, estado, responsable_id, creado_por
    ) values (
      upper(trim(p_codigo)), trim(p_nombre), nullif(trim(p_descripcion), ''), p_fecha,
      p_estado, p_responsable_id, auth.uid()
    ) returning id into v_id;
  else
    update public.rutas_proceso
    set codigo = upper(trim(p_codigo)),
      nombre = trim(p_nombre),
      descripcion = nullif(trim(p_descripcion), ''),
      fecha_programada = p_fecha,
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
  uuid, text, text, text, date, public.estado_ruta_proceso, uuid, uuid[], uuid[], jsonb
) from public;
grant execute on function public.guardar_ruta_proceso(
  uuid, text, text, text, date, public.estado_ruta_proceso, uuid, uuid[], uuid[], jsonb
) to authenticated;

create or replace function public.obtener_reporte_flota()
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_resultado jsonb;
begin
  if not public.es_gestor() then
    raise exception 'Solo Administradores y Encargados pueden consultar reportes';
  end if;
  select jsonb_build_object(
    'totales', jsonb_build_object(
      'rutas', (select count(*) from public.rutas_proceso),
      'kilometros', (select coalesce(sum(cantidad), 0) from public.ruta_movimientos_vehiculo where tipo = 'kilometraje'),
      'gasto_operativo', (select coalesce(sum(monto), 0) from public.ruta_movimientos_vehiculo),
      'gasto_flota', (select coalesce(sum(monto), 0) from public.vehiculo_gastos),
      'viaticos', (select coalesce(sum(viatico), 0) from public.ruta_participantes)
    ),
    'rutas', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', rp.id,
        'codigo', rp.codigo,
        'nombre', rp.nombre,
        'fecha', rp.fecha_programada,
        'estado', rp.estado,
        'responsable', u.nombre_completo,
        'solicitudes', (select count(*) from public.ruta_solicitudes rs where rs.ruta_id = rp.id),
        'vehiculos', (select count(*) from public.ruta_vehiculos rv where rv.ruta_id = rp.id),
        'kilometros', (select coalesce(sum(m.cantidad), 0) from public.ruta_movimientos_vehiculo m where m.ruta_id = rp.id and m.tipo = 'kilometraje'),
        'viaticos', (select coalesce(sum(p.viatico), 0) from public.ruta_participantes p where p.ruta_id = rp.id),
        'gastos',
          (select coalesce(sum(m.monto), 0) from public.ruta_movimientos_vehiculo m where m.ruta_id = rp.id)
          + (select coalesce(sum(p.viatico), 0) from public.ruta_participantes p where p.ruta_id = rp.id)
      ) order by rp.fecha_programada desc), '[]'::jsonb)
      from public.rutas_proceso rp
      join public.usuarios u on u.id = rp.responsable_id
    ),
    'vehiculos', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', v.id,
        'placa', v.placa,
        'tipo', v.tipo,
        'estado', v.estado,
        'kilometros', (select coalesce(sum(m.cantidad), 0) from public.ruta_movimientos_vehiculo m where m.vehiculo_id = v.id and m.tipo = 'kilometraje'),
        'gasto_operativo', (select coalesce(sum(m.monto), 0) from public.ruta_movimientos_vehiculo m where m.vehiculo_id = v.id),
        'gasto_flota', (select coalesce(sum(g.monto), 0) from public.vehiculo_gastos g where g.vehiculo_id = v.id),
        'depreciacion_acumulada', case
          when v.costo_inicial is null or v.fecha_adquisicion is null or v.vida_util_meses is null then 0
          else least(
            v.costo_inicial - v.valor_residual,
            greatest(0, (v.costo_inicial - v.valor_residual) / v.vida_util_meses *
              ((extract(year from age(current_date, v.fecha_adquisicion)) * 12) + extract(month from age(current_date, v.fecha_adquisicion))))
          )
        end
      ) order by v.placa), '[]'::jsonb)
      from public.vehiculos v
    )
  ) into v_resultado;
  return v_resultado;
end
$$;

