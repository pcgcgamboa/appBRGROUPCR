create or replace function public.transicion_estado_valida(
  anterior public.estado_solicitud,
  nuevo public.estado_solicitud
)
returns boolean language sql immutable set search_path = '' as $$
  select case anterior
    when 'creada' then nuevo in ('asignada', 'rechazada', 'cancelada')
    when 'asignada' then nuevo in ('en_atencion', 'cancelada')
    when 'en_atencion' then nuevo in ('en_espera_materiales', 'atendida', 'cancelada')
    when 'en_espera_materiales' then nuevo in ('en_atencion', 'atendida', 'cancelada')
    when 'atendida' then nuevo in ('cerrada', 'en_atencion', 'cancelada')
    when 'cerrada' then nuevo = 'asignada'
    else false
  end;
$$;

create or replace function public.validar_cambio_solicitud()
returns trigger
language plpgsql
security definer
set search_path = '' as $$
begin
  if new.estado <> old.estado then
    if not public.transicion_estado_valida(old.estado, new.estado) then
      raise exception 'Transición de estado no permitida: % -> %', old.estado, new.estado;
    end if;

    if new.estado = 'cerrada' and not exists (
      select 1 from public.validaciones_cierre v where v.solicitud_id = new.id
    ) then
      raise exception 'La solicitud requiere validación del cliente antes del cierre';
    end if;

    if old.estado = 'cerrada' and new.estado = 'asignada' then
      new.reabierta_en = now();
      new.cerrada_en = null;
    elsif new.estado = 'atendida' then
      new.atendida_en = now();
    elsif new.estado = 'cerrada' then
      new.cerrada_en = now();
    end if;
  end if;

  return new;
end;
$$;

create trigger validar_cambio_solicitud
before update on public.solicitudes
for each row execute function public.validar_cambio_solicitud();

create or replace function public.auditar_estado_solicitud()
returns trigger
language plpgsql
security definer
set search_path = '' as $$
begin
  if tg_op = 'INSERT' or new.estado <> old.estado then
    insert into public.solicitud_estados_historial (
      solicitud_id, estado_anterior, estado_nuevo, cambiado_por
    ) values (
      new.id,
      case when tg_op = 'UPDATE' then old.estado else null end,
      new.estado,
      auth.uid()
    );
  end if;
  return new;
end;
$$;

create trigger auditar_estado_solicitud
after insert or update on public.solicitudes
for each row execute function public.auditar_estado_solicitud();

create or replace function public.validar_ubicacion_solicitud()
returns trigger
language plpgsql
set search_path = '' as $$
begin
  if not exists (
    select 1 from public.ubicaciones u
    where u.id = new.ubicacion_id and u.cliente_id = new.cliente_id and u.activa
  ) then
    raise exception 'La ubicación no pertenece al cliente seleccionado';
  end if;
  return new;
end;
$$;

create trigger validar_ubicacion_solicitud
before insert or update of cliente_id, ubicacion_id on public.solicitudes
for each row execute function public.validar_ubicacion_solicitud();

create or replace function public.validar_material_avance()
returns trigger
language plpgsql
set search_path = '' as $$
begin
  if new.avance_id is not null and not exists (
    select 1 from public.avances a
    where a.id = new.avance_id and a.solicitud_id = new.solicitud_id
  ) then
    raise exception 'El avance no pertenece a la solicitud';
  end if;
  return new;
end;
$$;

create trigger validar_material_avance
before insert or update on public.solicitud_materiales
for each row execute function public.validar_material_avance();

create or replace function public.validar_adjunto_avance()
returns trigger
language plpgsql
set search_path = '' as $$
begin
  if new.avance_id is not null and not exists (
    select 1 from public.avances a
    where a.id = new.avance_id and a.solicitud_id = new.solicitud_id
  ) then
    raise exception 'El avance no pertenece a la solicitud';
  end if;
  return new;
end;
$$;

create trigger validar_adjunto_avance
before insert or update on public.adjuntos
for each row execute function public.validar_adjunto_avance();

create or replace function public.proteger_campos_usuario()
returns trigger
language plpgsql
set search_path = '' as $$
begin
  if not public.tiene_rol('administrador') and (
    new.id <> old.id
    or new.cliente_id is distinct from old.cliente_id
    or new.activo is distinct from old.activo
  ) then
    raise exception 'Solo un administrador puede modificar cliente, estado o identificador del usuario';
  end if;
  return new;
end;
$$;

create trigger proteger_campos_usuario
before update on public.usuarios
for each row execute function public.proteger_campos_usuario();
