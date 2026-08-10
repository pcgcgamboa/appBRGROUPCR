insert into public.roles (codigo, nombre, descripcion) values
  ('administrador', 'Administrador', 'Acceso completo al sistema y catálogos.'),
  ('encargado', 'Encargado de Proceso', 'Gestiona asignaciones, rutas y flujo.'),
  ('operador', 'Operador de Servicio', 'Atiende solicitudes asignadas.'),
  ('cliente', 'Cliente', 'Valida la atención de su organización.'),
  ('solicitante', 'Usuario solicitante', 'Crea y consulta sus solicitudes.')
on conflict (codigo) do nothing;

insert into public.tipos_solicitud (nombre, descripcion) values
  ('Mantenimiento', 'Mantenimiento preventivo o correctivo.'),
  ('Soporte', 'Soporte técnico o funcional.'),
  ('Reparación', 'Reparación de equipos o instalaciones.'),
  ('Instalación', 'Instalación de equipos o servicios.')
on conflict (nombre) do nothing;

create or replace function public.tiene_rol(codigo_rol text, usuario uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = '' as $$
  select exists (
    select 1
    from public.usuario_roles ur
    join public.roles r on r.id = ur.rol_id
    join public.usuarios u on u.id = ur.usuario_id
    where ur.usuario_id = usuario and r.codigo = codigo_rol and u.activo
  );
$$;

create or replace function public.es_gestor(usuario uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = '' as $$
  select public.tiene_rol('administrador', usuario)
      or public.tiene_rol('encargado', usuario);
$$;

create or replace function public.cliente_del_usuario(usuario uuid default auth.uid())
returns uuid
language sql
stable
security definer
set search_path = '' as $$
  select cliente_id from public.usuarios where id = usuario and activo;
$$;

create or replace function public.puede_ver_solicitud(solicitud uuid, usuario uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = '' as $$
  select public.es_gestor(usuario) or exists (
    select 1
    from public.solicitudes s
    where s.id = solicitud
      and (
        s.solicitante_id = usuario
        or s.operador_id = usuario
        or s.cliente_id = public.cliente_del_usuario(usuario)
        or exists (
          select 1 from public.ruta_operarios ro
          where ro.solicitud_id = s.id and ro.operario_id = usuario
        )
      )
  );
$$;

grant execute on function public.tiene_rol(text, uuid) to authenticated;
grant execute on function public.es_gestor(uuid) to authenticated;
grant execute on function public.cliente_del_usuario(uuid) to authenticated;
grant execute on function public.puede_ver_solicitud(uuid, uuid) to authenticated;

alter table public.clientes enable row level security;
alter table public.ubicaciones enable row level security;
alter table public.usuarios enable row level security;
alter table public.roles enable row level security;
alter table public.usuario_roles enable row level security;
alter table public.tipos_solicitud enable row level security;
alter table public.tipo_solicitud_sla enable row level security;
alter table public.materiales enable row level security;
alter table public.vehiculos enable row level security;
alter table public.solicitudes enable row level security;
alter table public.rutas enable row level security;
alter table public.ruta_operarios enable row level security;
alter table public.avances enable row level security;
alter table public.solicitud_materiales enable row level security;
alter table public.adjuntos enable row level security;
alter table public.solicitud_estados_historial enable row level security;
alter table public.validaciones_cierre enable row level security;
alter table public.notificaciones_config enable row level security;

create policy clientes_lectura on public.clientes for select to authenticated
using (public.es_gestor() or id = public.cliente_del_usuario());
create policy clientes_gestion on public.clientes for all to authenticated
using (public.tiene_rol('administrador')) with check (public.tiene_rol('administrador'));

create policy ubicaciones_lectura on public.ubicaciones for select to authenticated
using (public.es_gestor() or cliente_id = public.cliente_del_usuario());
create policy ubicaciones_gestion on public.ubicaciones for all to authenticated
using (public.tiene_rol('administrador')) with check (public.tiene_rol('administrador'));

create policy usuarios_lectura on public.usuarios for select to authenticated
using (
  id = auth.uid() or public.es_gestor()
  or exists (
    select 1 from public.solicitudes s
    where (s.operador_id = usuarios.id or s.solicitante_id = usuarios.id)
      and public.puede_ver_solicitud(s.id)
  )
);
create policy usuarios_actualizar_perfil on public.usuarios for update to authenticated
using (id = auth.uid() or public.tiene_rol('administrador'))
with check (id = auth.uid() or public.tiene_rol('administrador'));

create policy roles_lectura on public.roles for select to authenticated using (true);
create policy roles_gestion on public.roles for all to authenticated
using (public.tiene_rol('administrador')) with check (public.tiene_rol('administrador'));

create policy usuario_roles_lectura on public.usuario_roles for select to authenticated
using (usuario_id = auth.uid() or public.tiene_rol('administrador'));
create policy usuario_roles_gestion on public.usuario_roles for all to authenticated
using (public.tiene_rol('administrador')) with check (public.tiene_rol('administrador'));

create policy tipos_lectura on public.tipos_solicitud for select to authenticated using (activo or public.es_gestor());
create policy tipos_gestion on public.tipos_solicitud for all to authenticated
using (public.tiene_rol('administrador')) with check (public.tiene_rol('administrador'));
create policy sla_lectura on public.tipo_solicitud_sla for select to authenticated using (true);
create policy sla_gestion on public.tipo_solicitud_sla for all to authenticated
using (public.tiene_rol('administrador')) with check (public.tiene_rol('administrador'));

create policy materiales_lectura on public.materiales for select to authenticated using (activo or public.es_gestor());
create policy materiales_insertar on public.materiales for insert to authenticated
with check (public.es_gestor() or (public.tiene_rol('operador') and creado_por = auth.uid()));
create policy materiales_gestion on public.materiales for update to authenticated
using (public.tiene_rol('administrador')) with check (public.tiene_rol('administrador'));
create policy materiales_eliminar on public.materiales for delete to authenticated
using (public.tiene_rol('administrador'));

create policy vehiculos_lectura on public.vehiculos for select to authenticated
using (public.es_gestor() or public.tiene_rol('operador'));
create policy vehiculos_gestion on public.vehiculos for all to authenticated
using (public.tiene_rol('administrador')) with check (public.tiene_rol('administrador'));

create policy solicitudes_lectura on public.solicitudes for select to authenticated
using (public.puede_ver_solicitud(id));
create policy solicitudes_crear on public.solicitudes for insert to authenticated
with check (
  solicitante_id = auth.uid()
  and estado = 'creada'
  and prioridad is null
  and operador_id is null
  and cliente_id = public.cliente_del_usuario()
  and public.tiene_rol('solicitante')
);
create policy solicitudes_gestion on public.solicitudes for update to authenticated
using (public.es_gestor()) with check (public.es_gestor());
create policy solicitudes_eliminar on public.solicitudes for delete to authenticated
using (public.tiene_rol('administrador'));

create policy rutas_lectura on public.rutas for select to authenticated
using (public.puede_ver_solicitud(solicitud_id));
create policy rutas_crear on public.rutas for insert to authenticated
with check (public.es_gestor() and creado_por = auth.uid());
create policy rutas_actualizar on public.rutas for update to authenticated
using (public.es_gestor()) with check (public.es_gestor());
create policy rutas_eliminar on public.rutas for delete to authenticated
using (public.es_gestor());

create policy ruta_operarios_lectura on public.ruta_operarios for select to authenticated
using (public.puede_ver_solicitud(solicitud_id));
create policy ruta_operarios_gestion on public.ruta_operarios for all to authenticated
using (public.es_gestor()) with check (public.es_gestor());

create policy avances_lectura on public.avances for select to authenticated
using (public.puede_ver_solicitud(solicitud_id));
create policy avances_crear on public.avances for insert to authenticated
with check (
  operador_id = auth.uid()
  and public.tiene_rol('operador')
  and exists (
    select 1 from public.solicitudes s
    where s.id = solicitud_id and s.operador_id = auth.uid()
      and s.estado in ('asignada', 'en_atencion', 'en_espera_materiales')
  )
);
create policy avances_corregir on public.avances for update to authenticated
using (operador_id = auth.uid() and creado_en > now() - interval '15 minutes')
with check (operador_id = auth.uid());

create policy solicitud_materiales_lectura on public.solicitud_materiales for select to authenticated
using (public.puede_ver_solicitud(solicitud_id));
create policy solicitud_materiales_crear on public.solicitud_materiales for insert to authenticated
with check (
  registrado_por = auth.uid() and public.tiene_rol('operador')
  and exists (select 1 from public.solicitudes s where s.id = solicitud_id and s.operador_id = auth.uid())
);

create policy adjuntos_lectura on public.adjuntos for select to authenticated
using (public.puede_ver_solicitud(solicitud_id));
create policy adjuntos_crear on public.adjuntos for insert to authenticated
with check (subido_por = auth.uid() and public.puede_ver_solicitud(solicitud_id));
create policy adjuntos_eliminar on public.adjuntos for delete to authenticated
using (subido_por = auth.uid() or public.tiene_rol('administrador'));

create policy historial_lectura on public.solicitud_estados_historial for select to authenticated
using (public.puede_ver_solicitud(solicitud_id));

create policy validaciones_lectura on public.validaciones_cierre for select to authenticated
using (public.puede_ver_solicitud(solicitud_id));
create policy validaciones_crear on public.validaciones_cierre for insert to authenticated
with check (
  cliente_usuario_id = auth.uid() and public.tiene_rol('cliente')
  and exists (
    select 1 from public.solicitudes s
    where s.id = solicitud_id and s.cliente_id = public.cliente_del_usuario()
      and s.estado = 'atendida'
  )
);
create policy validaciones_actualizar on public.validaciones_cierre for update to authenticated
using (
  cliente_usuario_id = auth.uid()
  and exists (select 1 from public.solicitudes s where s.id = solicitud_id and s.estado = 'atendida')
)
with check (cliente_usuario_id = auth.uid());

create policy notificaciones_lectura on public.notificaciones_config for select to authenticated
using (public.puede_ver_solicitud(solicitud_id));
create policy notificaciones_gestion on public.notificaciones_config for all to authenticated
using (public.es_gestor()) with check (public.es_gestor() and configurado_por = auth.uid());

revoke all on all tables in schema public from anon;
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

revoke insert, update, delete on public.solicitud_estados_historial from authenticated;
revoke insert, update, delete on public.roles from authenticated;
grant insert, update, delete on public.roles to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'solicitudes-adjuntos', 'solicitudes-adjuntos', false, 10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy storage_adjuntos_lectura on storage.objects for select to authenticated
using (
  bucket_id = 'solicitudes-adjuntos'
  and public.puede_ver_solicitud(((storage.foldername(name))[1])::uuid)
);
create policy storage_adjuntos_crear on storage.objects for insert to authenticated
with check (
  bucket_id = 'solicitudes-adjuntos'
  and owner_id = auth.uid()::text
  and public.puede_ver_solicitud(((storage.foldername(name))[1])::uuid)
);
create policy storage_adjuntos_eliminar on storage.objects for delete to authenticated
using (
  bucket_id = 'solicitudes-adjuntos'
  and (owner_id = auth.uid()::text or public.tiene_rol('administrador'))
);
