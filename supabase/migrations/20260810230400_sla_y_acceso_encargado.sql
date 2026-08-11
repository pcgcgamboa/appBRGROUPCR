create policy usuario_roles_lectura_encargado
on public.usuario_roles for select to authenticated
using (public.tiene_rol('encargado'));

create or replace function public.crear_sla_predeterminado()
returns trigger
language plpgsql
security definer
set search_path = '' as $$
begin
  insert into public.tipo_solicitud_sla (tipo_solicitud_id, prioridad, horas)
  values
    (new.id, 'baja', 120),
    (new.id, 'media', 72),
    (new.id, 'alta', 48),
    (new.id, 'urgente', 24)
  on conflict (tipo_solicitud_id, prioridad) do nothing;
  return new;
end;
$$;

create trigger crear_sla_predeterminado
after insert on public.tipos_solicitud
for each row execute function public.crear_sla_predeterminado();

insert into public.tipo_solicitud_sla (tipo_solicitud_id, prioridad, horas)
select tipo.id, valores.prioridad::public.prioridad_solicitud, valores.horas
from public.tipos_solicitud tipo
cross join (values ('baja', 120), ('media', 72), ('alta', 48), ('urgente', 24)) as valores(prioridad, horas)
on conflict (tipo_solicitud_id, prioridad) do nothing;
