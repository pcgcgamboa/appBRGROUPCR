create or replace function public.proteger_roles_base()
returns trigger
language plpgsql
set search_path = '' as $$
begin
  if old.codigo in ('administrador', 'encargado', 'operador', 'cliente', 'solicitante')
    and (tg_op = 'DELETE' or new.codigo is distinct from old.codigo) then
    raise exception 'Los roles base del sistema no se pueden eliminar ni cambiar de código';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create trigger proteger_roles_base
before update or delete on public.roles
for each row execute function public.proteger_roles_base();
