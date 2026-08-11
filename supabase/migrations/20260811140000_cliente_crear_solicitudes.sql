drop policy if exists solicitudes_crear on public.solicitudes;

create policy solicitudes_crear
on public.solicitudes for insert to authenticated
with check (
  solicitante_id = auth.uid()
  and estado = 'creada'
  and prioridad is null
  and operador_id is null
  and cliente_id = public.cliente_del_usuario()
  and (
    public.tiene_rol('solicitante')
    or public.tiene_rol('cliente')
  )
);
