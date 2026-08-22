-- Permite que administradores y encargados asocien materiales directamente a solicitudes.

create policy solicitud_materiales_crear_gestor
on public.solicitud_materiales
for insert
to authenticated
with check (
  registrado_por = auth.uid()
  and public.es_gestor()
  and public.puede_ver_solicitud(solicitud_id)
  and avance_id is null
);

comment on policy solicitud_materiales_crear_gestor on public.solicitud_materiales is
  'Permite asociar materiales sin avance a administradores y encargados con acceso a la solicitud.';
