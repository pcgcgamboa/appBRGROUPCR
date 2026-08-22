-- Encapsula la asociacion de materiales para gestores y evita depender del INSERT directo con RLS.

drop policy if exists solicitud_materiales_crear_gestor on public.solicitud_materiales;

create or replace function public.agregar_material_solicitud_gestor(
  p_solicitud_id uuid,
  p_material_id uuid,
  p_cantidad numeric,
  p_costo_referencial_aplicado numeric default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Sesión inválida';
  end if;
  if not public.es_gestor(auth.uid()) then
    raise exception 'Solo Administradores y Encargados pueden asociar materiales';
  end if;
  if not exists (select 1 from public.solicitudes s where s.id = p_solicitud_id) then
    raise exception 'La solicitud no existe';
  end if;
  if not exists (
    select 1 from public.materiales m where m.id = p_material_id and m.activo
  ) then
    raise exception 'El material no existe o está inactivo';
  end if;
  if p_cantidad is null or p_cantidad <= 0 then
    raise exception 'La cantidad debe ser mayor que cero';
  end if;
  if p_costo_referencial_aplicado is not null and p_costo_referencial_aplicado < 0 then
    raise exception 'El costo no puede ser negativo';
  end if;

  insert into public.solicitud_materiales (
    solicitud_id,
    avance_id,
    material_id,
    cantidad,
    costo_referencial_aplicado,
    registrado_por
  ) values (
    p_solicitud_id,
    null,
    p_material_id,
    p_cantidad,
    p_costo_referencial_aplicado,
    auth.uid()
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.agregar_material_solicitud_gestor(uuid, uuid, numeric, numeric)
from public;
grant execute on function public.agregar_material_solicitud_gestor(uuid, uuid, numeric, numeric)
to authenticated;

comment on function public.agregar_material_solicitud_gestor(uuid, uuid, numeric, numeric) is
  'Asocia un material a una solicitud después de validar al administrador o encargado autenticado.';

-- Fuerza a PostgREST a descubrir la nueva RPC inmediatamente después de aplicar la migración.
notify pgrst, 'reload schema';
