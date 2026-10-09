-- La persona responsable de una ruta se muestra y queda asignada como
-- responsable preliminar de sus solicitudes.
create or replace function public.asignar_responsable_ruta_a_solicitud()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  update public.solicitudes solicitud
  set operador_id = ruta.responsable_id
  from public.rutas_proceso ruta
  where solicitud.id = new.solicitud_id
    and ruta.id = new.ruta_id;
  return new;
end;
$$;

create trigger asignar_responsable_ruta_a_solicitud
after insert on public.ruta_solicitudes
for each row execute function public.asignar_responsable_ruta_a_solicitud();

create or replace function public.actualizar_responsable_ruta_en_solicitudes()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.responsable_id is distinct from old.responsable_id then
    update public.solicitudes
    set operador_id = new.responsable_id
    where id in (select solicitud_id from public.ruta_solicitudes where ruta_id = new.id);
  end if;
  return new;
end;
$$;

create trigger actualizar_responsable_ruta_en_solicitudes
after update of responsable_id on public.rutas_proceso
for each row execute function public.actualizar_responsable_ruta_en_solicitudes();