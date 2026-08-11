create or replace function public.asociar_usuarios_cliente(
  p_cliente_id uuid,
  p_usuario_ids uuid[] default '{}'::uuid[]
)
returns void
language plpgsql
security invoker
set search_path = '' as $$
begin
  if not public.tiene_rol('administrador') then
    raise exception 'Solo un Administrador puede asociar usuarios a clientes';
  end if;

  if not exists (select 1 from public.clientes where id = p_cliente_id) then
    raise exception 'El cliente indicado no existe';
  end if;

  update public.usuarios
  set cliente_id = null
  where cliente_id = p_cliente_id
    and not (id = any(coalesce(p_usuario_ids, '{}'::uuid[])));

  update public.usuarios
  set cliente_id = p_cliente_id
  where id = any(coalesce(p_usuario_ids, '{}'::uuid[]));
end;
$$;

revoke all on function public.asociar_usuarios_cliente(uuid, uuid[]) from public;
grant execute on function public.asociar_usuarios_cliente(uuid, uuid[]) to authenticated;
