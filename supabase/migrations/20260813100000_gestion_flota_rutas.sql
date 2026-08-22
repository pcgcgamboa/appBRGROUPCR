-- Gestion agrupada de rutas y control integral de flota.
-- Es una migracion aditiva: conserva rutas, solicitudes y datos existentes.

create type public.estado_ruta_proceso as enum ('planificada', 'en_curso', 'finalizada', 'cancelada');
create type public.tipo_movimiento_vehiculo as enum ('combustible', 'kilometraje', 'lavado', 'otro');
create type public.tipo_gasto_vehiculo as enum ('mantenimiento', 'cambio_aceite', 'reparacion', 'seguro', 'depreciacion', 'otro');

alter table public.vehiculos
  add column costo_inicial numeric(14,2) check (costo_inicial >= 0),
  add column fecha_adquisicion date,
  add column vida_util_meses integer check (vida_util_meses > 0),
  add column valor_residual numeric(14,2) not null default 0 check (valor_residual >= 0);

create table public.rutas_proceso (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  nombre text not null check (length(trim(nombre)) > 0),
  descripcion text,
  fecha_programada date not null,
  estado public.estado_ruta_proceso not null default 'planificada',
  responsable_id uuid not null references public.usuarios(id) on delete restrict,
  creado_por uuid not null references public.usuarios(id) on delete restrict,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create table public.ruta_solicitudes (
  ruta_id uuid not null references public.rutas_proceso(id) on delete cascade,
  solicitud_id uuid not null references public.solicitudes(id) on delete restrict,
  orden integer not null default 1 check (orden > 0),
  agregado_en timestamptz not null default now(),
  primary key (ruta_id, solicitud_id),
  unique (solicitud_id)
);

create table public.ruta_vehiculos (
  ruta_id uuid not null references public.rutas_proceso(id) on delete cascade,
  vehiculo_id uuid not null references public.vehiculos(id) on delete restrict,
  es_principal boolean not null default false,
  asignado_en timestamptz not null default now(),
  primary key (ruta_id, vehiculo_id)
);

create unique index ruta_vehiculo_principal_unico
  on public.ruta_vehiculos(ruta_id) where es_principal;

create table public.ruta_movimientos_vehiculo (
  id uuid primary key default gen_random_uuid(),
  ruta_id uuid not null references public.rutas_proceso(id) on delete cascade,
  vehiculo_id uuid not null references public.vehiculos(id) on delete restrict,
  tipo public.tipo_movimiento_vehiculo not null,
  cantidad numeric(14,2) check (cantidad is null or cantidad >= 0),
  unidad text,
  monto numeric(14,2) not null default 0 check (monto >= 0),
  detalle text,
  fecha date not null default current_date,
  registrado_por uuid not null references public.usuarios(id) on delete restrict,
  creado_en timestamptz not null default now(),
  check (tipo <> 'kilometraje' or cantidad is not null),
  check (tipo <> 'combustible' or cantidad is not null)
);

create table public.vehiculo_indisponibilidades (
  id uuid primary key default gen_random_uuid(),
  vehiculo_id uuid not null references public.vehiculos(id) on delete restrict,
  razon text not null check (length(trim(razon)) > 0),
  detalle text,
  inicio date not null default current_date,
  fin date,
  registrado_por uuid not null references public.usuarios(id) on delete restrict,
  creado_en timestamptz not null default now(),
  check (fin is null or fin >= inicio)
);

create table public.vehiculo_gastos (
  id uuid primary key default gen_random_uuid(),
  vehiculo_id uuid not null references public.vehiculos(id) on delete restrict,
  ruta_id uuid references public.rutas_proceso(id) on delete set null,
  tipo public.tipo_gasto_vehiculo not null,
  concepto text not null check (length(trim(concepto)) > 0),
  monto numeric(14,2) not null check (monto >= 0),
  fecha date not null default current_date,
  comprobante text,
  registrado_por uuid not null references public.usuarios(id) on delete restrict,
  creado_en timestamptz not null default now()
);

create index rutas_proceso_fecha_idx on public.rutas_proceso(fecha_programada desc, estado);
create index movimientos_ruta_idx on public.ruta_movimientos_vehiculo(ruta_id, fecha desc);
create index gastos_vehiculo_idx on public.vehiculo_gastos(vehiculo_id, fecha desc);
create index indisponibilidades_vehiculo_idx on public.vehiculo_indisponibilidades(vehiculo_id, inicio desc);

create trigger rutas_proceso_actualizado before update on public.rutas_proceso
for each row execute function public.actualizar_marca_tiempo();

alter table public.rutas_proceso enable row level security;
alter table public.ruta_solicitudes enable row level security;
alter table public.ruta_vehiculos enable row level security;
alter table public.ruta_movimientos_vehiculo enable row level security;
alter table public.vehiculo_indisponibilidades enable row level security;
alter table public.vehiculo_gastos enable row level security;

create policy rutas_proceso_lectura on public.rutas_proceso for select to authenticated using (true);
create policy rutas_proceso_gestion on public.rutas_proceso for all to authenticated
using (public.es_gestor()) with check (public.es_gestor());
create policy ruta_solicitudes_lectura on public.ruta_solicitudes for select to authenticated using (true);
create policy ruta_solicitudes_gestion on public.ruta_solicitudes for all to authenticated
using (public.es_gestor()) with check (public.es_gestor());
create policy ruta_vehiculos_lectura on public.ruta_vehiculos for select to authenticated using (true);
create policy ruta_vehiculos_gestion on public.ruta_vehiculos for all to authenticated
using (public.es_gestor()) with check (public.es_gestor());
create policy movimientos_lectura on public.ruta_movimientos_vehiculo for select to authenticated using (true);
create policy movimientos_crear on public.ruta_movimientos_vehiculo for insert to authenticated
with check (
  registrado_por = auth.uid() and (
    public.es_gestor()
    or exists (
      select 1 from public.rutas_proceso rp
      where rp.id = ruta_id and (
        rp.responsable_id = auth.uid()
        or exists (
          select 1 from public.ruta_solicitudes rs
          join public.solicitudes s on s.id = rs.solicitud_id
          where rs.ruta_id = rp.id and s.operador_id = auth.uid()
        )
      )
    )
  )
);
create policy indisponibilidades_lectura on public.vehiculo_indisponibilidades for select to authenticated using (true);
create policy indisponibilidades_gestion on public.vehiculo_indisponibilidades for all to authenticated
using (public.tiene_rol('administrador')) with check (public.tiene_rol('administrador') and registrado_por = auth.uid());
create policy gastos_lectura on public.vehiculo_gastos for select to authenticated using (true);
create policy gastos_gestion on public.vehiculo_gastos for all to authenticated
using (public.tiene_rol('administrador')) with check (public.tiene_rol('administrador') and registrado_por = auth.uid());

create or replace function public.guardar_ruta_proceso(
  p_id uuid, p_codigo text, p_nombre text, p_descripcion text, p_fecha date,
  p_estado public.estado_ruta_proceso, p_responsable_id uuid,
  p_solicitudes uuid[], p_vehiculos uuid[]
) returns uuid language plpgsql set search_path = '' as $$
declare v_id uuid; v_item uuid; v_orden integer := 0;
begin
  if not public.es_gestor() then raise exception 'Solo un administrador o encargado puede definir rutas'; end if;
  if coalesce(array_length(p_solicitudes, 1), 0) = 0 then raise exception 'Incluya al menos una solicitud'; end if;
  if coalesce(array_length(p_vehiculos, 1), 0) = 0 then raise exception 'Asocie al menos un vehiculo'; end if;
  if not exists (
    select 1 from public.usuarios u join public.usuario_roles ur on ur.usuario_id = u.id
    join public.roles r on r.id = ur.rol_id
    where u.id = p_responsable_id and u.activo and r.codigo in ('operador', 'encargado')
  ) then raise exception 'El responsable debe ser un operario o encargado activo'; end if;
  if exists (select 1 from unnest(p_vehiculos) x join public.vehiculos v on v.id=x where not v.activo or v.estado='mantenimiento')
    or (select count(*) from unnest(p_vehiculos)) <> (select count(*) from public.vehiculos where id=any(p_vehiculos))
  then raise exception 'Todos los vehiculos deben estar activos y disponibles para operacion'; end if;

  if p_id is null then
    insert into public.rutas_proceso(codigo,nombre,descripcion,fecha_programada,estado,responsable_id,creado_por)
    values(upper(trim(p_codigo)),trim(p_nombre),nullif(trim(p_descripcion),''),p_fecha,p_estado,p_responsable_id,auth.uid()) returning id into v_id;
  else
    update public.rutas_proceso set codigo=upper(trim(p_codigo)), nombre=trim(p_nombre), descripcion=nullif(trim(p_descripcion),''),
      fecha_programada=p_fecha, estado=p_estado, responsable_id=p_responsable_id where id=p_id returning id into v_id;
    if v_id is null then raise exception 'Ruta no encontrada'; end if;
    delete from public.ruta_solicitudes where ruta_id=v_id;
    delete from public.ruta_vehiculos where ruta_id=v_id;
  end if;
  foreach v_item in array p_solicitudes loop
    v_orden := v_orden + 1;
    insert into public.ruta_solicitudes(ruta_id,solicitud_id,orden) values(v_id,v_item,v_orden);
  end loop;
  v_orden := 0;
  foreach v_item in array p_vehiculos loop
    v_orden := v_orden + 1;
    insert into public.ruta_vehiculos(ruta_id,vehiculo_id,es_principal) values(v_id,v_item,v_orden=1);
  end loop;
  return v_id;
end $$;

create or replace function public.obtener_reporte_flota()
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare v_resultado jsonb;
begin
  if not public.es_gestor() then raise exception 'Solo Administradores y Encargados pueden consultar reportes'; end if;
  select jsonb_build_object(
    'totales', jsonb_build_object(
      'rutas', (select count(*) from public.rutas_proceso),
      'kilometros', (select coalesce(sum(cantidad),0) from public.ruta_movimientos_vehiculo where tipo='kilometraje'),
      'gasto_operativo', (select coalesce(sum(monto),0) from public.ruta_movimientos_vehiculo),
      'gasto_flota', (select coalesce(sum(monto),0) from public.vehiculo_gastos)
    ),
    'rutas', (select coalesce(jsonb_agg(jsonb_build_object('id',rp.id,'codigo',rp.codigo,'nombre',rp.nombre,'fecha',rp.fecha_programada,
      'estado',rp.estado,'responsable',u.nombre_completo,'solicitudes',(select count(*) from public.ruta_solicitudes rs where rs.ruta_id=rp.id),
      'vehiculos',(select count(*) from public.ruta_vehiculos rv where rv.ruta_id=rp.id),'kilometros',(select coalesce(sum(m.cantidad),0) from public.ruta_movimientos_vehiculo m where m.ruta_id=rp.id and m.tipo='kilometraje'),
      'gastos',(select coalesce(sum(m.monto),0) from public.ruta_movimientos_vehiculo m where m.ruta_id=rp.id)) order by rp.fecha_programada desc),'[]'::jsonb)
      from public.rutas_proceso rp join public.usuarios u on u.id=rp.responsable_id),
    'vehiculos', (select coalesce(jsonb_agg(jsonb_build_object('id',v.id,'placa',v.placa,'tipo',v.tipo,'estado',v.estado,
      'kilometros',(select coalesce(sum(m.cantidad),0) from public.ruta_movimientos_vehiculo m where m.vehiculo_id=v.id and m.tipo='kilometraje'),
      'gasto_operativo',(select coalesce(sum(m.monto),0) from public.ruta_movimientos_vehiculo m where m.vehiculo_id=v.id),
      'gasto_flota',(select coalesce(sum(g.monto),0) from public.vehiculo_gastos g where g.vehiculo_id=v.id),
      'depreciacion_acumulada', case when v.costo_inicial is null or v.fecha_adquisicion is null or v.vida_util_meses is null then 0 else
        least(v.costo_inicial-v.valor_residual, greatest(0,(v.costo_inicial-v.valor_residual)/v.vida_util_meses *
          ((extract(year from age(current_date,v.fecha_adquisicion))*12)+extract(month from age(current_date,v.fecha_adquisicion))))) end) order by v.placa),'[]'::jsonb)
      from public.vehiculos v)
  ) into v_resultado;
  return v_resultado;
end $$;

revoke all on function public.guardar_ruta_proceso(uuid,text,text,text,date,public.estado_ruta_proceso,uuid,uuid[],uuid[]) from public;
grant execute on function public.guardar_ruta_proceso(uuid,text,text,text,date,public.estado_ruta_proceso,uuid,uuid[],uuid[]) to authenticated;
revoke all on function public.obtener_reporte_flota() from public;
grant execute on function public.obtener_reporte_flota() to authenticated;

-- Datos de demostracion. UUID fijos permiten ejecutar la migracion de forma idempotente.
insert into public.clientes(id,nombre,identificacion,email_contacto,telefono_contacto,activo)
values('f6000000-0000-4000-8000-000000000001','Cliente Demostración Flota','DEMO-FLOTA-01','flota.demo@example.com','+506 2200-0101',true)
on conflict(id) do nothing;

insert into public.ubicaciones(id,cliente_id,nombre,provincia,canton,distrito,otras_senas,latitud,longitud,activa)
values
('f6100000-0000-4000-8000-000000000001','f6000000-0000-4000-8000-000000000001','Sede San José','San José','San José','Carmen','100 m norte del parque',9.936600,-84.078600,true),
('f6100000-0000-4000-8000-000000000002','f6000000-0000-4000-8000-000000000001','Bodega Alajuela','Alajuela','Alajuela','San José','Zona industrial',10.016250,-84.211630,true)
on conflict(id) do nothing;

insert into public.materiales(id,nombre,descripcion,unidad_medida,costo_referencial,activo)
values
('f6200000-0000-4000-8000-000000000001','Aceite de motor 5W-30','Dato de demostración para mantenimiento de flota','litro',8500,true),
('f6200000-0000-4000-8000-000000000002','Filtro de aceite','Dato de demostración para mantenimiento de flota','unidad',12000,true)
on conflict(id) do nothing;

insert into public.vehiculos(id,placa,capacidad,tipo,estado,activo,costo_inicial,fecha_adquisicion,vida_util_meses,valor_residual)
values
('a1000000-0000-4000-8000-000000000001','DEM-101','1.5 toneladas','Camion liviano','disponible',true,18500000,'2024-01-15',96,2500000),
('a1000000-0000-4000-8000-000000000002','DEM-202','5 pasajeros','Pickup 4x4','disponible',true,26500000,'2023-06-01',120,4000000),
('a1000000-0000-4000-8000-000000000003','DEM-303','2 pasajeros','Motocicleta','mantenimiento',true,3200000,'2025-02-10',60,400000)
on conflict (id) do nothing;

do $$
declare v_admin uuid; v_resp uuid; v_sol1 uuid; v_sol2 uuid; v_ruta uuid := 'b2000000-0000-4000-8000-000000000001';
begin
  select ur.usuario_id into v_admin from public.usuario_roles ur join public.roles r on r.id=ur.rol_id where r.codigo='administrador' limit 1;
  select ur.usuario_id into v_resp from public.usuario_roles ur join public.roles r on r.id=ur.rol_id where r.codigo in ('encargado','operador') order by r.codigo limit 1;
  select id into v_sol1 from public.solicitudes where estado not in ('cerrada','cancelada','rechazada') order by creado_en limit 1;
  select id into v_sol2 from public.solicitudes where estado not in ('cerrada','cancelada','rechazada') and id<>v_sol1 order by creado_en limit 1;
  if v_admin is not null and v_resp is not null and v_sol1 is not null then
    insert into public.rutas_proceso(id,codigo,nombre,descripcion,fecha_programada,estado,responsable_id,creado_por)
    values(v_ruta,'RUTA-DEMO-01','Ruta de demostracion GAM','Atencion agrupada de solicitudes existentes',current_date,'planificada',v_resp,v_admin) on conflict(id) do nothing;
    insert into public.ruta_solicitudes(ruta_id,solicitud_id,orden) values(v_ruta,v_sol1,1) on conflict do nothing;
    if v_sol2 is not null then insert into public.ruta_solicitudes(ruta_id,solicitud_id,orden) values(v_ruta,v_sol2,2) on conflict do nothing; end if;
    insert into public.ruta_vehiculos(ruta_id,vehiculo_id,es_principal) values(v_ruta,'a1000000-0000-4000-8000-000000000001',true),
      (v_ruta,'a1000000-0000-4000-8000-000000000002',false) on conflict do nothing;
    insert into public.ruta_movimientos_vehiculo(id,ruta_id,vehiculo_id,tipo,cantidad,unidad,monto,detalle,registrado_por)
    values('c3000000-0000-4000-8000-000000000001',v_ruta,'a1000000-0000-4000-8000-000000000001','combustible',35,'litros',28000,'Reabastecimiento inicial',v_resp),
      ('c3000000-0000-4000-8000-000000000002',v_ruta,'a1000000-0000-4000-8000-000000000001','kilometraje',86,'km',0,'Recorrido de la ruta',v_resp),
      ('c3000000-0000-4000-8000-000000000003',v_ruta,'a1000000-0000-4000-8000-000000000002','lavado',null,null,8500,'Lavado posterior',v_resp) on conflict(id) do nothing;
    insert into public.vehiculo_indisponibilidades(id,vehiculo_id,razon,detalle,inicio,registrado_por)
    values('d4000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000003','Mantenimiento','Revision preventiva y cambio de frenos',current_date,v_admin) on conflict(id) do nothing;
    insert into public.vehiculo_gastos(id,vehiculo_id,tipo,concepto,monto,fecha,registrado_por)
    values('e5000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000003','mantenimiento','Revision preventiva',125000,current_date,v_admin),
      ('e5000000-0000-4000-8000-000000000002','a1000000-0000-4000-8000-000000000001','cambio_aceite','Aceite y filtro',78000,current_date,v_admin) on conflict(id) do nothing;
  end if;
end $$;
