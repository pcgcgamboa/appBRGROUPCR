-- Adjuntos de la solicitud: el Cliente/solicitante los agrega o elimina solo mientras la solicitud
-- es su borrador ("creada"); una vez enviada ya no la modifica (puede seguir enviando documentos
-- por Mensajes, que es otra tabla). Gestores y operadores conservan su acceso.

drop policy if exists adjuntos_crear on public.adjuntos;
create policy adjuntos_crear on public.adjuntos for insert to authenticated
with check (
  subido_por = auth.uid() and public.puede_ver_solicitud(solicitud_id) and (
    public.es_gestor() or public.tiene_rol('operador')
    or exists (select 1 from public.solicitudes s where s.id = solicitud_id and s.estado = 'creada')
  )
);

drop policy if exists adjuntos_eliminar on public.adjuntos;
create policy adjuntos_eliminar on public.adjuntos for delete to authenticated
using (
  public.tiene_rol('administrador')
  or (
    subido_por = auth.uid() and (
      public.es_gestor() or public.tiene_rol('operador')
      or exists (select 1 from public.solicitudes s where s.id = solicitud_id and s.estado = 'creada')
    )
  )
);
