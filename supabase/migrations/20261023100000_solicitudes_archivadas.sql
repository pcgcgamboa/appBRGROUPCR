-- Portal del Cliente/Solicitante: "Archivar" una solicitud la oculta de "Mis solicitudes" del
-- usuario que la archiva (se consulta aparte, en la vista de archivadas). Es una preferencia de
-- vista por usuario, no un estado de la solicitud: en el portal todos los usuarios de una
-- organización ven las mismas solicitudes, y archivar no debe ocultársela a los demás ni pasar
-- por los triggers de transición de estado de public.solicitudes. Mismo patrón que
-- notificaciones_internas_lecturas (PK compuesto, solo filas propias).

create table if not exists public.solicitudes_archivadas (
  solicitud_id uuid not null references public.solicitudes(id) on delete cascade,
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  archivada_en timestamptz not null default now(),
  primary key (solicitud_id, usuario_id)
);
create index if not exists solicitudes_archivadas_usuario_idx
  on public.solicitudes_archivadas(usuario_id);

alter table public.solicitudes_archivadas enable row level security;

drop policy if exists solicitudes_archivadas_propias on public.solicitudes_archivadas;
create policy solicitudes_archivadas_propias on public.solicitudes_archivadas
for select to authenticated using (usuario_id = auth.uid());

-- Solo se archivan solicitudes que el usuario puede ver y que ya terminaron: una en curso (o un
-- borrador sin enviar) seguiría necesitando su atención y no debe quedar oculta.
drop policy if exists solicitudes_archivar on public.solicitudes_archivadas;
create policy solicitudes_archivar on public.solicitudes_archivadas
for insert to authenticated with check (
  usuario_id = auth.uid()
  and public.puede_ver_solicitud(solicitud_id, auth.uid())
  and exists (
    select 1 from public.solicitudes s
    where s.id = solicitud_id and s.estado in ('cerrada', 'cancelada', 'rechazada')
  )
);

drop policy if exists solicitudes_desarchivar on public.solicitudes_archivadas;
create policy solicitudes_desarchivar on public.solicitudes_archivadas
for delete to authenticated using (usuario_id = auth.uid());

-- Sin UPDATE: archivar usa ON CONFLICT DO NOTHING (ver el adaptador), que no lo requiere.
grant select, insert, delete on public.solicitudes_archivadas to authenticated;
