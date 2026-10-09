-- Mensajería interna entre administrador, encargado y operador (staff).
-- Complementa, sin tocar, solicitud_comunicaciones (cliente incluido, por
-- ticket) y notificaciones_internas (feed de eventos de sistema).

create table public.mensajes_internos (
  id uuid primary key default gen_random_uuid(),
  remitente_id uuid not null references public.usuarios(id) on delete restrict,
  destinatario_id uuid references public.usuarios(id) on delete restrict,
  destinatario_rol text check (destinatario_rol in ('administrador','encargado','operador')),
  solicitud_id uuid references public.solicitudes(id) on delete cascade,
  cuerpo text not null check (length(trim(cuerpo)) > 0),
  creado_en timestamptz not null default now(),
  -- Exactamente un modo de direccionamiento por mensaje: directo, difusión a rol, o nota de solicitud.
  check (
    (destinatario_id is not null)::int
    + (destinatario_rol is not null)::int
    + (solicitud_id is not null)::int = 1
  )
);

create index mensajes_internos_directo_idx
  on public.mensajes_internos(remitente_id, destinatario_id, creado_en desc)
  where destinatario_id is not null;
create index mensajes_internos_difusion_idx
  on public.mensajes_internos(destinatario_rol, creado_en desc)
  where destinatario_rol is not null;
create index mensajes_internos_solicitud_idx
  on public.mensajes_internos(solicitud_id, creado_en desc)
  where solicitud_id is not null;

-- Clona el patrón ya probado de notificaciones_internas_lecturas (mismo PK compuesto).
create table public.mensajes_internos_lecturas (
  mensaje_id uuid not null references public.mensajes_internos(id) on delete cascade,
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  leido_en timestamptz not null default now(),
  primary key (mensaje_id, usuario_id)
);

-- Funciones nuevas y aditivas: no se modifica tiene_rol, es_gestor,
-- cliente_del_usuario ni puede_ver_solicitud.
create or replace function public.es_staff(usuario uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = '' as $$
  select public.es_gestor(usuario) or public.tiene_rol('operador', usuario);
$$;
grant execute on function public.es_staff(uuid) to authenticated;

-- Deliberadamente distinta de puede_ver_solicitud(): esa función también
-- devuelve true para el solicitante/cliente del ticket, lo que filtraría
-- notas internas hacia ellos. Esta se limita al subconjunto staff.
create or replace function public.puede_ver_nota_solicitud(solicitud uuid, usuario uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = '' as $$
  select public.es_gestor(usuario) or exists (
    select 1 from public.solicitudes s where s.id = solicitud and s.operador_id = usuario
  );
$$;
grant execute on function public.puede_ver_nota_solicitud(uuid, uuid) to authenticated;

-- Directorio de staff: hoy usuarios_lectura no permite que un operador vea
-- la fila de otro miembro del staff sin un vínculo de solicitud. Política
-- aditiva (coexiste por OR con usuarios_lectura); nunca expone filas de
-- cliente/solicitante porque ambos lados de la condición exigen es_staff.
create policy usuarios_lectura_directorio_staff on public.usuarios for select to authenticated
using (public.es_staff() and public.es_staff(usuarios.id));

alter table public.mensajes_internos enable row level security;
alter table public.mensajes_internos_lecturas enable row level security;

create policy mensajes_lectura on public.mensajes_internos for select to authenticated
using (
  remitente_id = auth.uid()
  or destinatario_id = auth.uid()
  or (destinatario_rol is not null and public.tiene_rol(destinatario_rol))
  or (solicitud_id is not null and public.puede_ver_nota_solicitud(solicitud_id))
);

create policy mensajes_crear on public.mensajes_internos for insert to authenticated
with check (
  remitente_id = auth.uid() and public.es_staff()
  and (
    (destinatario_id is not null and public.es_staff(destinatario_id) and destinatario_id <> auth.uid())
    or (destinatario_rol is not null and public.es_gestor())
    or (solicitud_id is not null and public.puede_ver_nota_solicitud(solicitud_id))
  )
);
-- Sin update/delete en v1: mensajes inmutables, igual que solicitud_comunicaciones.
grant select, insert on public.mensajes_internos to authenticated;

create policy mensajes_lecturas_propias on public.mensajes_internos_lecturas
for select to authenticated using (usuario_id = auth.uid());
create policy mensajes_marcar_leido on public.mensajes_internos_lecturas
for insert to authenticated with check (
  usuario_id = auth.uid() and exists (select 1 from public.mensajes_internos m where m.id = mensaje_id)
);
create policy mensajes_desmarcar_leido on public.mensajes_internos_lecturas
for delete to authenticated using (usuario_id = auth.uid());
grant select, insert, delete on public.mensajes_internos_lecturas to authenticated;

-- Nota: el modo "nota de solicitud" NO dispara registrar_actividad_solicitud
-- / tracking_comunicacion_solicitud a propósito — ese trigger escribe en
-- solicitud_estados_historial, visible al cliente vía puede_ver_solicitud().
-- Una nota interna nunca debe dejar rastro en el timeline que ve el cliente.
