create extension if not exists pgcrypto;

create type public.prioridad_solicitud as enum ('baja', 'media', 'alta', 'urgente');
create type public.estado_solicitud as enum (
  'creada', 'asignada', 'en_atencion', 'en_espera_materiales',
  'atendida', 'cerrada', 'cancelada', 'rechazada'
);
create type public.estado_vehiculo as enum ('disponible', 'en_uso', 'mantenimiento');
create type public.estado_operario_ruta as enum ('disponible', 'en_ruta', 'ocupado');
create type public.estado_checkpoint as enum ('pendiente', 'en_transito', 'llego');
create type public.tipo_adjunto as enum ('imagen', 'documento');

create table public.clientes (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (length(trim(nombre)) > 0),
  identificacion text,
  email_contacto text,
  telefono_contacto text,
  activo boolean not null default true,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create unique index clientes_identificacion_unica
  on public.clientes (lower(identificacion)) where identificacion is not null;

create table public.ubicaciones (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  nombre text not null,
  provincia text not null,
  canton text not null,
  distrito text not null,
  otras_senas text,
  latitud numeric(9,6) check (latitud between -90 and 90),
  longitud numeric(9,6) check (longitud between -180 and 180),
  activa boolean not null default true,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  check ((latitud is null) = (longitud is null))
);

create table public.usuarios (
  id uuid primary key references auth.users(id) on delete cascade,
  cliente_id uuid references public.clientes(id) on delete set null,
  nombre_completo text not null default '',
  telefono text,
  activo boolean not null default true,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create table public.roles (
  id smallint generated always as identity primary key,
  codigo text not null unique check (codigo ~ '^[a-z_]+$'),
  nombre text not null,
  descripcion text,
  creado_en timestamptz not null default now()
);

create table public.usuario_roles (
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  rol_id smallint not null references public.roles(id) on delete restrict,
  asignado_por uuid references public.usuarios(id) on delete set null,
  asignado_en timestamptz not null default now(),
  primary key (usuario_id, rol_id)
);

create table public.tipos_solicitud (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  descripcion text,
  activo boolean not null default true,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create table public.tipo_solicitud_sla (
  tipo_solicitud_id uuid not null references public.tipos_solicitud(id) on delete cascade,
  prioridad public.prioridad_solicitud not null,
  horas integer not null check (horas > 0),
  primary key (tipo_solicitud_id, prioridad),
  check (prioridad <> 'urgente' or horas <= 24)
);

create table public.materiales (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  descripcion text,
  unidad_medida text not null,
  costo_referencial numeric(14,2) check (costo_referencial >= 0),
  activo boolean not null default true,
  creado_por uuid references public.usuarios(id) on delete set null,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create unique index materiales_nombre_unidad_unicos
  on public.materiales (lower(nombre), lower(unidad_medida));

create table public.vehiculos (
  id uuid primary key default gen_random_uuid(),
  placa text not null unique,
  capacidad text,
  tipo text not null,
  estado public.estado_vehiculo not null default 'disponible',
  activo boolean not null default true,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create table public.solicitudes (
  id uuid primary key default gen_random_uuid(),
  numero bigint generated always as identity unique,
  nombre text not null check (length(trim(nombre)) > 0),
  tipo_solicitud_id uuid not null references public.tipos_solicitud(id) on delete restrict,
  detalle text not null check (length(trim(detalle)) > 0),
  cliente_id uuid not null references public.clientes(id) on delete restrict,
  ubicacion_id uuid not null references public.ubicaciones(id) on delete restrict,
  solicitante_id uuid not null references public.usuarios(id) on delete restrict,
  operador_id uuid references public.usuarios(id) on delete restrict,
  prioridad public.prioridad_solicitud,
  estado public.estado_solicitud not null default 'creada',
  sla_horas integer check (sla_horas > 0),
  sla_vence_en timestamptz,
  atendida_en timestamptz,
  cerrada_en timestamptz,
  motivo_rechazo_cancelacion text,
  reabierta_en timestamptz,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  check ((prioridad is null) = (sla_horas is null)),
  check ((sla_horas is null) = (sla_vence_en is null)),
  check (estado in ('creada', 'rechazada', 'cancelada') or prioridad is not null),
  check (estado not in ('asignada', 'en_atencion', 'en_espera_materiales', 'atendida', 'cerrada') or operador_id is not null),
  check (estado not in ('rechazada', 'cancelada') or motivo_rechazo_cancelacion is not null)
);

create index solicitudes_estado_prioridad_idx on public.solicitudes (estado, prioridad, creado_en desc);
create index solicitudes_cliente_idx on public.solicitudes (cliente_id, creado_en desc);
create index solicitudes_operador_idx on public.solicitudes (operador_id, estado);
create index solicitudes_solicitante_idx on public.solicitudes (solicitante_id, creado_en desc);

create table public.rutas (
  solicitud_id uuid primary key references public.solicitudes(id) on delete cascade,
  vehiculo_id uuid references public.vehiculos(id) on delete restrict,
  provincia text not null,
  canton text not null,
  distrito text not null,
  otras_senas text,
  latitud numeric(9,6) check (latitud between -90 and 90),
  longitud numeric(9,6) check (longitud between -180 and 180),
  estado_vehiculo public.estado_vehiculo not null default 'disponible',
  estado_checkpoint public.estado_checkpoint not null default 'pendiente',
  creado_por uuid not null references public.usuarios(id) on delete restrict,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  check ((latitud is null) = (longitud is null))
);

create table public.ruta_operarios (
  solicitud_id uuid not null references public.rutas(solicitud_id) on delete cascade,
  operario_id uuid not null references public.usuarios(id) on delete restrict,
  estado public.estado_operario_ruta not null default 'disponible',
  asignado_en timestamptz not null default now(),
  primary key (solicitud_id, operario_id)
);

create table public.avances (
  id uuid primary key default gen_random_uuid(),
  solicitud_id uuid not null references public.solicitudes(id) on delete cascade,
  operador_id uuid not null references public.usuarios(id) on delete restrict,
  vehiculo_id uuid references public.vehiculos(id) on delete restrict,
  horas_trabajadas numeric(6,2) not null check (horas_trabajadas >= 0 and horas_trabajadas <= 24),
  porcentaje smallint not null check (porcentaje between 0 and 100),
  narrativa text not null check (length(trim(narrativa)) > 0),
  creado_en timestamptz not null default now()
);

create index avances_solicitud_idx on public.avances (solicitud_id, creado_en desc);

create table public.solicitud_materiales (
  id uuid primary key default gen_random_uuid(),
  solicitud_id uuid not null references public.solicitudes(id) on delete cascade,
  avance_id uuid references public.avances(id) on delete cascade,
  material_id uuid not null references public.materiales(id) on delete restrict,
  cantidad numeric(14,3) not null check (cantidad > 0),
  costo_referencial_aplicado numeric(14,2) check (costo_referencial_aplicado >= 0),
  registrado_por uuid not null references public.usuarios(id) on delete restrict,
  creado_en timestamptz not null default now()
);

create table public.adjuntos (
  id uuid primary key default gen_random_uuid(),
  solicitud_id uuid not null references public.solicitudes(id) on delete cascade,
  avance_id uuid references public.avances(id) on delete cascade,
  subido_por uuid not null references public.usuarios(id) on delete restrict,
  nombre_archivo text not null,
  ruta_storage text not null unique,
  tipo public.tipo_adjunto not null,
  mime_type text not null,
  tamano_bytes bigint not null check (tamano_bytes > 0),
  creado_en timestamptz not null default now()
);

create table public.solicitud_estados_historial (
  id bigint generated always as identity primary key,
  solicitud_id uuid not null references public.solicitudes(id) on delete cascade,
  estado_anterior public.estado_solicitud,
  estado_nuevo public.estado_solicitud not null,
  cambiado_por uuid references public.usuarios(id) on delete set null,
  comentario text,
  creado_en timestamptz not null default now()
);

create index historial_solicitud_idx on public.solicitud_estados_historial (solicitud_id, creado_en desc);

create table public.validaciones_cierre (
  solicitud_id uuid primary key references public.solicitudes(id) on delete cascade,
  cliente_usuario_id uuid not null references public.usuarios(id) on delete restrict,
  satisfecho boolean not null,
  comentario text,
  validado_en timestamptz not null default now(),
  check (satisfecho or length(trim(coalesce(comentario, ''))) > 0)
);

create table public.notificaciones_config (
  solicitud_id uuid not null references public.solicitudes(id) on delete cascade,
  estado public.estado_solicitud not null,
  activa boolean not null default false,
  configurado_por uuid not null references public.usuarios(id) on delete restrict,
  actualizado_en timestamptz not null default now(),
  primary key (solicitud_id, estado)
);

create or replace function public.actualizar_marca_tiempo()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.actualizado_en = now();
  return new;
end;
$$;

create trigger clientes_actualizado before update on public.clientes
for each row execute function public.actualizar_marca_tiempo();
create trigger ubicaciones_actualizado before update on public.ubicaciones
for each row execute function public.actualizar_marca_tiempo();
create trigger usuarios_actualizado before update on public.usuarios
for each row execute function public.actualizar_marca_tiempo();
create trigger tipos_solicitud_actualizado before update on public.tipos_solicitud
for each row execute function public.actualizar_marca_tiempo();
create trigger materiales_actualizado before update on public.materiales
for each row execute function public.actualizar_marca_tiempo();
create trigger vehiculos_actualizado before update on public.vehiculos
for each row execute function public.actualizar_marca_tiempo();
create trigger solicitudes_actualizado before update on public.solicitudes
for each row execute function public.actualizar_marca_tiempo();
create trigger rutas_actualizado before update on public.rutas
for each row execute function public.actualizar_marca_tiempo();

create or replace function public.crear_perfil_usuario()
returns trigger
language plpgsql
security definer set search_path = '' as $$
begin
  insert into public.usuarios (id, nombre_completo)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'nombre_completo', ''));
  return new;
end;
$$;

create trigger al_crear_usuario_auth
after insert on auth.users
for each row execute function public.crear_perfil_usuario();

insert into public.usuarios (id, nombre_completo)
select id, coalesce(raw_user_meta_data ->> 'nombre_completo', '')
from auth.users
on conflict (id) do nothing;

comment on table public.usuario_roles is 'Relación multirrol; las asignaciones solo se permiten a administradores.';
comment on column public.solicitudes.sla_horas is 'Copia inmutable del SLA aplicable al asignar prioridad.';
comment on column public.adjuntos.ruta_storage is 'Ruta privada dentro del bucket solicitudes-adjuntos.';
