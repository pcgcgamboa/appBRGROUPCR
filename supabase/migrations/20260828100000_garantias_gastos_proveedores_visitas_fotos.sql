-- Configuración operativa y seguimiento de garantía.
create table public.configuracion_operativa (
  id boolean primary key default true check (id),
  garantia_dias integer not null default 30 check (garantia_dias between 0 and 3650),
  actualizado_por uuid references public.usuarios(id) on delete set null,
  actualizado_en timestamptz not null default now()
);
insert into public.configuracion_operativa(id) values(true) on conflict(id) do nothing;
alter table public.configuracion_operativa enable row level security;
create policy configuracion_operativa_lectura on public.configuracion_operativa
for select to authenticated using(true);
create policy configuracion_operativa_gestion on public.configuracion_operativa
for update to authenticated using(public.tiene_rol('administrador'))
with check(public.tiene_rol('administrador'));
grant select, update on public.configuracion_operativa to authenticated;

alter table public.solicitudes
add column garantia_inicia_en timestamptz,
add column garantia_vence_en timestamptz;

create or replace function public.establecer_garantia_solicitud()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_dias integer;
begin
  if new.estado = 'cerrada' and old.estado is distinct from 'cerrada' then
    select garantia_dias into v_dias from public.configuracion_operativa where id=true;
    new.garantia_inicia_en := coalesce(new.cerrada_en, now());
    new.garantia_vence_en := coalesce(new.cerrada_en, now()) + make_interval(days => coalesce(v_dias, 30));
  elsif old.estado = 'cerrada' and new.estado <> 'cerrada' then
    new.garantia_inicia_en := null;
    new.garantia_vence_en := null;
  end if;
  return new;
end $$;
create trigger establecer_garantia_solicitud
before update of estado on public.solicitudes
for each row execute function public.establecer_garantia_solicitud();

update public.solicitudes s
set garantia_inicia_en=coalesce(s.cerrada_en, v.validado_en),
    garantia_vence_en=coalesce(s.cerrada_en, v.validado_en) + make_interval(days => c.garantia_dias)
from public.validaciones_cierre v cross join public.configuracion_operativa c
where s.id=v.solicitud_id and s.estado='cerrada' and s.garantia_vence_en is null;

create table public.solicitud_garantia_interacciones (
  id uuid primary key default gen_random_uuid(),
  solicitud_id uuid not null references public.solicitudes(id) on delete cascade,
  tipo text not null check(tipo in ('solicitud_atencion','informacion','resolucion')),
  detalle text not null check(length(trim(detalle))>0),
  estado text not null default 'registrada' check(estado in ('registrada','en_revision','resuelta','rechazada')),
  creado_por uuid not null references public.usuarios(id) on delete restrict,
  creado_en timestamptz not null default now()
);
create index solicitud_garantia_interacciones_idx on public.solicitud_garantia_interacciones(solicitud_id,creado_en desc);
alter table public.solicitud_garantia_interacciones enable row level security;
create policy garantia_lectura on public.solicitud_garantia_interacciones
for select to authenticated using(public.puede_ver_solicitud(solicitud_id));
create policy garantia_crear on public.solicitud_garantia_interacciones
for insert to authenticated with check(
  creado_por=auth.uid() and public.puede_ver_solicitud(solicitud_id) and (
    public.es_gestor() or public.tiene_rol('operador') or (
      public.tiene_rol('cliente') and tipo='solicitud_atencion' and exists(
        select 1 from public.solicitudes s where s.id=solicitud_id and s.garantia_vence_en >= now()
      )
    )
  )
);
grant select,insert on public.solicitud_garantia_interacciones to authenticated;

create or replace function public.tracking_garantia_solicitud()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  perform public.registrar_actividad_solicitud(new.solicitud_id,'garantia',
    case new.tipo when 'solicitud_atencion' then 'Atención por garantía solicitada'
      when 'resolucion' then 'Garantía resuelta' else 'Información de garantía agregada' end,
    new.detalle,new.creado_por,'solicitud_garantia_interacciones',new.id::text,
    jsonb_build_object('tipo',new.tipo,'estado',new.estado),new.creado_en);
  return new;
end $$;
create trigger tracking_garantia_solicitud after insert on public.solicitud_garantia_interacciones
for each row execute function public.tracking_garantia_solicitud();

-- Gastos generales o asignados a un participante de una ruta.
create table public.ruta_gastos (
  id uuid primary key default gen_random_uuid(),
  ruta_id uuid not null references public.rutas_proceso(id) on delete cascade,
  participante_id uuid references public.usuarios(id) on delete restrict,
  concepto text not null check(length(trim(concepto))>0),
  monto numeric(14,2) not null check(monto>0),
  fecha date not null default current_date,
  detalle text,
  registrado_por uuid not null references public.usuarios(id) on delete restrict,
  creado_en timestamptz not null default now(),
  constraint ruta_gasto_participante_valido foreign key(ruta_id,participante_id)
    references public.ruta_participantes(ruta_id,usuario_id) on delete restrict
);
create index ruta_gastos_ruta_idx on public.ruta_gastos(ruta_id,fecha desc,creado_en desc);
alter table public.ruta_gastos enable row level security;
create policy ruta_gastos_lectura on public.ruta_gastos for select to authenticated using(true);
create policy ruta_gastos_gestion on public.ruta_gastos for all to authenticated
using(public.es_gestor()) with check(public.es_gestor() and registrado_por=auth.uid());
grant select,insert,update,delete on public.ruta_gastos to authenticated;

create or replace function public.tracking_ruta_gasto()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_nombre text;
begin
  select nombre_completo into v_nombre from public.usuarios where id=new.participante_id;
  insert into public.ruta_actividades(ruta_id,tipo,titulo,descripcion,actor_id,datos,creado_en)
  values(new.ruta_id,'gasto','Gasto de ruta registrado',new.concepto || ' · ₡' || new.monto ||
    coalesce(' · '||v_nombre,'') || coalesce(' — '||new.detalle,''),new.registrado_por,
    jsonb_build_object('gasto_id',new.id,'participante_id',new.participante_id,'monto',new.monto,
      'concepto',new.concepto,'fecha',new.fecha),new.creado_en);
  return new;
end $$;
create trigger tracking_ruta_gasto after insert on public.ruta_gastos
for each row execute function public.tracking_ruta_gasto();

-- Los proveedores pueden ofrecer materiales o servicios con costo fijo o por hora.
alter table public.materiales
add column naturaleza_provision text not null default 'material'
check(naturaleza_provision in ('material','servicio'));
comment on column public.materiales.naturaleza_provision is
  'Distingue materiales físicos y servicios ofrecidos por proveedores.';

-- Programación de llegada e información visible para el cliente.
create table public.solicitud_visitas (
  id uuid primary key default gen_random_uuid(),
  solicitud_id uuid not null references public.solicitudes(id) on delete cascade,
  llegada_estimada timestamptz not null,
  indicaciones text,
  informado_por uuid not null references public.usuarios(id) on delete restrict,
  creado_en timestamptz not null default now()
);
create index solicitud_visitas_idx on public.solicitud_visitas(solicitud_id,llegada_estimada desc);
alter table public.solicitud_visitas enable row level security;
create policy solicitud_visitas_lectura on public.solicitud_visitas for select to authenticated
using(public.puede_ver_solicitud(solicitud_id));
create policy solicitud_visitas_crear on public.solicitud_visitas for insert to authenticated
with check(informado_por=auth.uid() and (public.es_gestor() or public.tiene_rol('operador'))
  and public.puede_ver_solicitud(solicitud_id));
grant select,insert on public.solicitud_visitas to authenticated;

create or replace function public.tracking_visita_solicitud()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  perform public.registrar_actividad_solicitud(new.solicitud_id,'visita','Llegada programada',
    'Hora estimada: ' || to_char(new.llegada_estimada at time zone 'America/Costa_Rica','DD/MM/YYYY HH24:MI') ||
    coalesce(' — '||new.indicaciones,''),new.informado_por,'solicitud_visitas',new.id::text,
    jsonb_build_object('llegada_estimada',new.llegada_estimada,'indicaciones',new.indicaciones),new.creado_en);
  return new;
end $$;
create trigger tracking_visita_solicitud after insert on public.solicitud_visitas
for each row execute function public.tracking_visita_solicitud();

-- Fotografías de postulantes y usuarios.
alter table public.usuarios add column foto_url text;
alter table public.tecnicos add column foto_url text;
alter table public.postulacion_tecnico_documentos drop constraint postulacion_tecnico_documentos_tipo_check;
alter table public.postulacion_tecnico_documentos add constraint postulacion_tecnico_documentos_tipo_check
check(tipo in ('hoja_vida','hoja_delincuencia','cedula','fotografia'));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('perfiles','perfiles',false,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
create policy perfiles_lectura_autorizada on storage.objects for select to authenticated
using(
  bucket_id='perfiles' and (
    (storage.foldername(name))[1]=auth.uid()::text
    or public.es_gestor()
    or exists(
      select 1
      from public.ruta_participantes rp
      join public.ruta_solicitudes rs on rs.ruta_id=rp.ruta_id
      where rp.usuario_id::text=(storage.foldername(name))[1]
        and public.puede_ver_solicitud(rs.solicitud_id)
    )
  )
);
create policy perfiles_usuario_crear on storage.objects for insert to authenticated
with check(bucket_id='perfiles' and (storage.foldername(name))[1]=auth.uid()::text);
create policy perfiles_admin_crear on storage.objects for insert to authenticated
with check(bucket_id='perfiles' and public.tiene_rol('administrador'));
create policy perfiles_usuario_actualizar on storage.objects for update to authenticated
using(bucket_id='perfiles' and ((storage.foldername(name))[1]=auth.uid()::text or public.tiene_rol('administrador')))
with check(bucket_id='perfiles');





