-- Tracking independiente de rutas de proceso.
create table public.ruta_actividades (
  id bigint generated always as identity primary key,
  ruta_id uuid not null references public.rutas_proceso(id) on delete cascade,
  tipo text not null,
  titulo text not null,
  descripcion text,
  actor_id uuid references public.usuarios(id) on delete set null,
  datos jsonb not null default '{}'::jsonb,
  creado_en timestamptz not null default now()
);
create index ruta_actividades_ruta_idx on public.ruta_actividades(ruta_id, creado_en desc, id desc);
alter table public.ruta_actividades enable row level security;
create policy ruta_actividades_lectura on public.ruta_actividades for select to authenticated
using (
  public.es_gestor() or exists (
    select 1 from public.rutas_proceso r
    where r.id = ruta_id and (
      r.responsable_id = auth.uid() or exists (
        select 1 from public.ruta_solicitudes rs join public.solicitudes s on s.id = rs.solicitud_id
        where rs.ruta_id = r.id and s.operador_id = auth.uid()
      )
    )
  )
);
grant select on public.ruta_actividades to authenticated;
revoke insert, update, delete on public.ruta_actividades from authenticated;

create or replace function public.tracking_ruta_cambios()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_ruta uuid; v_solicitud uuid; v_vehiculo uuid; v_descripcion text;
begin
  if tg_table_name = 'rutas_proceso' then
    v_ruta := new.id;
    insert into public.ruta_actividades(ruta_id,tipo,titulo,descripcion,actor_id,datos,creado_en)
    values(v_ruta,'ruta',case when tg_op='INSERT' then 'Ruta creada' else 'Ruta actualizada' end,
      new.codigo || ' · ' || new.nombre,auth.uid(),
      jsonb_build_object('estado',new.estado,'fecha',new.fecha_programada,'responsable_id',new.responsable_id),
      case when tg_op='INSERT' then new.creado_en else now() end);
  elsif tg_table_name = 'ruta_vehiculos' then
    v_ruta := case when tg_op='DELETE' then old.ruta_id else new.ruta_id end;
    v_vehiculo := case when tg_op='DELETE' then old.vehiculo_id else new.vehiculo_id end;
    select placa || ' · ' || tipo into v_descripcion from public.vehiculos where id=v_vehiculo;
    insert into public.ruta_actividades(ruta_id,tipo,titulo,descripcion,actor_id,datos)
    values(v_ruta,'vehiculo',case when tg_op='DELETE' then 'Vehículo retirado' else 'Vehículo agregado' end,
      v_descripcion,auth.uid(),jsonb_build_object('vehiculo_id',v_vehiculo,'operacion',lower(tg_op)));
  elsif tg_table_name = 'ruta_solicitudes' then
    v_ruta := case when tg_op='DELETE' then old.ruta_id else new.ruta_id end;
    v_solicitud := case when tg_op='DELETE' then old.solicitud_id else new.solicitud_id end;
    select '#' || numero || ' · ' || nombre into v_descripcion from public.solicitudes where id=v_solicitud;
    insert into public.ruta_actividades(ruta_id,tipo,titulo,descripcion,actor_id,datos)
    values(v_ruta,'solicitud',case when tg_op='DELETE' then 'Solicitud retirada' else 'Solicitud agregada' end,
      v_descripcion,auth.uid(),jsonb_build_object('solicitud_id',v_solicitud,'operacion',lower(tg_op)));
  end if;
  return case when tg_op='DELETE' then old else new end;
end $$;
create trigger tracking_ruta after insert or update on public.rutas_proceso
for each row execute function public.tracking_ruta_cambios();
create trigger tracking_ruta_vehiculos after insert or delete on public.ruta_vehiculos
for each row execute function public.tracking_ruta_cambios();
create trigger tracking_ruta_solicitudes after insert or delete on public.ruta_solicitudes
for each row execute function public.tracking_ruta_cambios();

create or replace function public.tracking_ruta_movimiento()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_placa text;
begin
  select placa into v_placa from public.vehiculos where id=new.vehiculo_id;
  insert into public.ruta_actividades(ruta_id,tipo,titulo,descripcion,actor_id,datos,creado_en)
  values(new.ruta_id,'movimiento',
    case new.tipo when 'combustible' then 'Carga de combustible'
      when 'kilometraje' then 'Kilometraje registrado'
      when 'lavado' then 'Lavado registrado' else 'Movimiento de vehículo' end,
    v_placa || coalesce(' · ' || new.cantidad || ' ' || new.unidad,'') ||
      case when new.monto>0 then ' · ₡' || new.monto else '' end || coalesce(' — ' || new.detalle,''),
    new.registrado_por,
    jsonb_build_object('vehiculo_id',new.vehiculo_id,'tipo',new.tipo,'cantidad',new.cantidad,
      'unidad',new.unidad,'monto',new.monto,'detalle',new.detalle,'fecha',new.fecha),new.creado_en);
  return new;
end $$;
create trigger tracking_ruta_movimiento after insert on public.ruta_movimientos_vehiculo
for each row execute function public.tracking_ruta_movimiento();

-- Mensajes, documentos y proformas asociados a solicitudes.
create table public.solicitud_comunicaciones (
  id uuid primary key default gen_random_uuid(),
  solicitud_id uuid not null references public.solicitudes(id) on delete cascade,
  tipo text not null default 'mensaje' check(tipo in ('mensaje','proforma')),
  asunto text not null check(length(trim(asunto))>0),
  mensaje text not null check(length(trim(mensaje))>0),
  monto numeric(14,2) check(monto is null or monto>=0),
  enviado_por uuid not null references public.usuarios(id) on delete restrict,
  creado_en timestamptz not null default now(),
  check(tipo='proforma' or monto is null)
);
create table public.solicitud_comunicacion_adjuntos (
  id uuid primary key default gen_random_uuid(),
  comunicacion_id uuid not null references public.solicitud_comunicaciones(id) on delete cascade,
  solicitud_id uuid not null references public.solicitudes(id) on delete cascade,
  nombre_archivo text not null,
  ruta_storage text not null unique,
  mime_type text not null,
  tamano_bytes bigint not null check(tamano_bytes>0),
  creado_en timestamptz not null default now()
);
create index comunicaciones_solicitud_idx on public.solicitud_comunicaciones(solicitud_id,creado_en desc);
alter table public.solicitud_comunicaciones enable row level security;
alter table public.solicitud_comunicacion_adjuntos enable row level security;
create policy comunicaciones_lectura on public.solicitud_comunicaciones for select to authenticated
using(public.puede_ver_solicitud(solicitud_id));
create policy comunicaciones_crear on public.solicitud_comunicaciones for insert to authenticated
with check(
  enviado_por=auth.uid() and public.puede_ver_solicitud(solicitud_id) and (
    public.es_gestor() or public.tiene_rol('cliente') or exists(
      select 1 from public.solicitudes s where s.id=solicitud_id and s.operador_id=auth.uid()
    )
  )
);
create policy comunicacion_adjuntos_lectura on public.solicitud_comunicacion_adjuntos
for select to authenticated using(public.puede_ver_solicitud(solicitud_id));
create policy comunicacion_adjuntos_crear on public.solicitud_comunicacion_adjuntos
for insert to authenticated with check(public.puede_ver_solicitud(solicitud_id));
grant select,insert on public.solicitud_comunicaciones to authenticated;
grant select,insert on public.solicitud_comunicacion_adjuntos to authenticated;

create or replace function public.tracking_comunicacion_solicitud()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform public.registrar_actividad_solicitud(new.solicitud_id,'comunicacion',
    case when new.tipo='proforma' then 'Proforma enviada' else 'Mensaje enviado' end,
    new.asunto || case when new.monto is null then '' else ' · ₡' || new.monto end,
    new.enviado_por,'solicitud_comunicaciones',new.id::text,
    jsonb_build_object('tipo',new.tipo,'asunto',new.asunto,'monto',new.monto),new.creado_en);
  return new;
end $$;
create trigger tracking_comunicacion_solicitud after insert on public.solicitud_comunicaciones
for each row execute function public.tracking_comunicacion_solicitud();

-- Recupera datos ya existentes de rutas.
insert into public.ruta_actividades(ruta_id,tipo,titulo,descripcion,actor_id,datos,creado_en)
select r.id,'ruta','Ruta creada',r.codigo || ' · ' || r.nombre,r.creado_por,
  jsonb_build_object('estado',r.estado,'fecha',r.fecha_programada,'responsable_id',r.responsable_id),r.creado_en
from public.rutas_proceso r;
insert into public.ruta_actividades(ruta_id,tipo,titulo,descripcion,actor_id,datos,creado_en)
select m.ruta_id,'movimiento',case m.tipo when 'combustible' then 'Carga de combustible'
  when 'kilometraje' then 'Kilometraje registrado' when 'lavado' then 'Lavado registrado'
  else 'Movimiento de vehículo' end,
  v.placa || coalesce(' · ' || m.cantidad || ' ' || m.unidad,'') ||
  case when m.monto>0 then ' · ₡' || m.monto else '' end || coalesce(' — ' || m.detalle,''),
  m.registrado_por,jsonb_build_object('vehiculo_id',m.vehiculo_id,'tipo',m.tipo,
  'cantidad',m.cantidad,'unidad',m.unidad,'monto',m.monto,'detalle',m.detalle,'fecha',m.fecha),m.creado_en
from public.ruta_movimientos_vehiculo m join public.vehiculos v on v.id=m.vehiculo_id;
