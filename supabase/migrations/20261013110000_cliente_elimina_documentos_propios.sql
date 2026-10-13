-- El Cliente puede eliminar los documentos de su expediente que él mismo subió (no los que aportó
-- el proveedor). Antes solo los gestores podían eliminar, y el botón del portal no tenía efecto.

drop policy if exists cliente_documentos_eliminar on public.cliente_documentos;
create policy cliente_documentos_eliminar on public.cliente_documentos for delete to authenticated
using (
  public.es_gestor()
  or (subido_por = auth.uid() and cliente_id = public.cliente_del_usuario())
);

drop policy if exists storage_clientes_documentos_eliminar on storage.objects;
create policy storage_clientes_documentos_eliminar on storage.objects for delete to authenticated
using (
  bucket_id = 'clientes-documentos' and (
    public.es_gestor()
    or (
      owner_id = auth.uid()::text
      and ((storage.foldername(name))[1])::uuid = public.cliente_del_usuario()
    )
  )
);
