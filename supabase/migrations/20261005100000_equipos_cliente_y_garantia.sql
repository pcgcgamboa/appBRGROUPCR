-- Equipos del cliente (horno, congelador, etc.) y garantía como tipo de solicitud que reclama un
-- equipo y un trabajo ya realizado. El equipo se elige al CREAR la solicitud (no al registrar el
-- avance) — tanto el Encargado/Administrador como el Cliente/Solicitante pueden seleccionar uno ya
-- asociado al cliente o agregar uno nuevo al vuelo, que queda en el inventario del cliente.

create table public.equipos_cliente (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  nombre text not null,
  marca text,
  modelo text,
  serie text,
  activo boolean not null default true,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create index equipos_cliente_cliente_idx on public.equipos_cliente (cliente_id);

alter table public.equipos_cliente enable row level security;

-- Mismo criterio que ubicaciones: gestores ven todo; los usuarios de portal del cliente ven los
-- equipos de su propia organización (necesario para el selector de equipo en SolicitudForm).
create policy equipos_cliente_lectura on public.equipos_cliente for select to authenticated
using (public.es_gestor() or cliente_id = public.cliente_del_usuario());

-- Gestión directa (panel de catálogo en Clientes, administrador únicamente) — igual que
-- ubicaciones_gestion. El alta inline desde la creación de una solicitud no depende de esto: pasa
-- por crear_solicitud_portal/crear_solicitud_gestor, funciones security definer que insertan sin
-- necesitar que el cliente/encargado tenga permiso directo sobre esta tabla.
create policy equipos_cliente_gestion on public.equipos_cliente for all to authenticated
using (public.tiene_rol('administrador')) with check (public.tiene_rol('administrador'));

comment on table public.equipos_cliente is
  'Inventario de equipos (horno, congelador, etc.) asociados a cada cliente, seleccionable al crear una solicitud.';

-- Marca qué tipo(s) de solicitud representan una garantía, sin depender de comparar el nombre
-- como texto. El administrador marca la casilla al crear/editar el tipo "Garantía" en Tipos.
alter table public.tipos_solicitud add column es_garantia boolean not null default false;

-- El equipo sobre el que se solicita el servicio, y — solo para solicitudes de garantía — la
-- solicitud original (el trabajo ya realizado) que se está reclamando.
alter table public.solicitudes add column equipo_id uuid references public.equipos_cliente(id) on delete set null;
alter table public.solicitudes add column solicitud_original_id uuid references public.solicitudes(id) on delete set null;

-- crear_solicitud_portal: se agrega p_equipo_id, p_equipo_nuevo (jsonb con nombre/marca/modelo/
-- serie, para dar de alta un equipo nuevo en la misma transacción — mismo patrón que
-- registrar_avance_operador ya usa con materiales libres) y p_solicitud_original_id, todos al
-- final con default null para no romper ningún llamado existente.
drop function if exists public.crear_solicitud_portal(text, uuid, uuid, text, uuid);

create function public.crear_solicitud_portal(
  p_nombre text,
  p_tipo_solicitud_id uuid,
  p_ubicacion_id uuid,
  p_detalle text,
  p_idempotencia_clave uuid default null,
  p_equipo_id uuid default null,
  p_equipo_nuevo jsonb default null,
  p_solicitud_original_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = '' as $$
declare
  v_usuario_id uuid := auth.uid();
  v_cliente_id uuid;
  v_solicitud_id uuid;
  v_numero bigint;
  v_resultado jsonb;
  v_es_garantia boolean;
  v_equipo_id uuid := p_equipo_id;
begin
  if p_idempotencia_clave is not null then
    select resultado into v_resultado
    from public.idempotencia_claves where clave = p_idempotencia_clave;
    if v_resultado is not null then
      return v_resultado;
    end if;
  end if;

  if v_usuario_id is null then
    raise exception 'La sesión no es válida';
  end if;

  if not (
    public.tiene_rol('solicitante', v_usuario_id)
    or public.tiene_rol('cliente', v_usuario_id)
  ) then
    raise exception 'El usuario no tiene permiso para crear solicitudes';
  end if;

  v_cliente_id := public.cliente_del_usuario(v_usuario_id);
  if v_cliente_id is null then
    raise exception 'El usuario debe estar asociado a un cliente activo';
  end if;

  if not exists (
    select 1
    from public.ubicaciones
    where id = p_ubicacion_id
      and cliente_id = v_cliente_id
      and activa
  ) then
    raise exception 'La ubicación no pertenece al cliente o está inactiva';
  end if;

  select es_garantia into v_es_garantia
  from public.tipos_solicitud
  where id = p_tipo_solicitud_id and activo;
  if v_es_garantia is null then
    raise exception 'El tipo de solicitud no está disponible';
  end if;

  if v_equipo_id is null and p_equipo_nuevo is not null then
    insert into public.equipos_cliente (cliente_id, nombre, marca, modelo, serie)
    values (
      v_cliente_id,
      trim(p_equipo_nuevo ->> 'nombre'),
      nullif(trim(p_equipo_nuevo ->> 'marca'), ''),
      nullif(trim(p_equipo_nuevo ->> 'modelo'), ''),
      nullif(trim(p_equipo_nuevo ->> 'serie'), '')
    )
    returning id into v_equipo_id;
  end if;

  if v_equipo_id is not null and not exists (
    select 1 from public.equipos_cliente where id = v_equipo_id and cliente_id = v_cliente_id
  ) then
    raise exception 'El equipo no pertenece al cliente';
  end if;

  if p_solicitud_original_id is not null and not exists (
    select 1 from public.solicitudes
    where id = p_solicitud_original_id
      and cliente_id = v_cliente_id
      and estado in ('atendida', 'cerrada')
  ) then
    raise exception 'La solicitud original no pertenece al cliente o no está atendida';
  end if;

  if v_es_garantia and (v_equipo_id is null or p_solicitud_original_id is null) then
    raise exception 'Una solicitud de garantía requiere el equipo y la solicitud original';
  end if;

  insert into public.solicitudes (
    nombre, tipo_solicitud_id, detalle, cliente_id, ubicacion_id, solicitante_id,
    equipo_id, solicitud_original_id
  ) values (
    trim(p_nombre), p_tipo_solicitud_id, trim(p_detalle),
    v_cliente_id, p_ubicacion_id, v_usuario_id,
    v_equipo_id, p_solicitud_original_id
  )
  returning id, numero into v_solicitud_id, v_numero;

  v_resultado := jsonb_build_object('id', v_solicitud_id, 'numero', v_numero);

  if p_idempotencia_clave is not null then
    insert into public.idempotencia_claves(clave, usuario_id, operacion, resultado)
    values (p_idempotencia_clave, v_usuario_id, 'crear_solicitud_portal', v_resultado)
    on conflict (clave) do nothing;
  end if;

  return v_resultado;
end;
$$;

revoke all on function public.crear_solicitud_portal(text, uuid, uuid, text, uuid, uuid, jsonb, uuid) from public;
grant execute on function public.crear_solicitud_portal(text, uuid, uuid, text, uuid, uuid, jsonb, uuid) to authenticated;

-- crear_solicitud_gestor: mismo tratamiento, con p_cliente_id explícito (el Encargado/
-- Administrador elige el cliente) en vez de resolverlo de la sesión.
drop function if exists public.crear_solicitud_gestor(text, uuid, uuid, uuid, text, uuid);

create function public.crear_solicitud_gestor(
  p_nombre text,
  p_tipo_solicitud_id uuid,
  p_cliente_id uuid,
  p_ubicacion_id uuid,
  p_detalle text,
  p_idempotencia_clave uuid default null,
  p_equipo_id uuid default null,
  p_equipo_nuevo jsonb default null,
  p_solicitud_original_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = '' as $$
declare
  v_usuario_id uuid := auth.uid();
  v_solicitud_id uuid;
  v_numero bigint;
  v_resultado jsonb;
  v_es_garantia boolean;
  v_equipo_id uuid := p_equipo_id;
begin
  if p_idempotencia_clave is not null then
    select resultado into v_resultado
    from public.idempotencia_claves where clave = p_idempotencia_clave;
    if v_resultado is not null then
      return v_resultado;
    end if;
  end if;

  if v_usuario_id is null or not public.es_gestor(v_usuario_id) then
    raise exception 'Solo un Administrador o Encargado puede crear solicitudes para un cliente';
  end if;

  if not exists (select 1 from public.clientes where id = p_cliente_id and activo) then
    raise exception 'El cliente indicado no existe o está inactivo';
  end if;

  if not exists (
    select 1 from public.ubicaciones
    where id = p_ubicacion_id and cliente_id = p_cliente_id and activa
  ) then
    raise exception 'La ubicación no pertenece al cliente o está inactiva';
  end if;

  select es_garantia into v_es_garantia
  from public.tipos_solicitud
  where id = p_tipo_solicitud_id and activo;
  if v_es_garantia is null then
    raise exception 'El tipo de solicitud no está disponible';
  end if;

  if v_equipo_id is null and p_equipo_nuevo is not null then
    insert into public.equipos_cliente (cliente_id, nombre, marca, modelo, serie)
    values (
      p_cliente_id,
      trim(p_equipo_nuevo ->> 'nombre'),
      nullif(trim(p_equipo_nuevo ->> 'marca'), ''),
      nullif(trim(p_equipo_nuevo ->> 'modelo'), ''),
      nullif(trim(p_equipo_nuevo ->> 'serie'), '')
    )
    returning id into v_equipo_id;
  end if;

  if v_equipo_id is not null and not exists (
    select 1 from public.equipos_cliente where id = v_equipo_id and cliente_id = p_cliente_id
  ) then
    raise exception 'El equipo no pertenece al cliente';
  end if;

  if p_solicitud_original_id is not null and not exists (
    select 1 from public.solicitudes
    where id = p_solicitud_original_id
      and cliente_id = p_cliente_id
      and estado in ('atendida', 'cerrada')
  ) then
    raise exception 'La solicitud original no pertenece al cliente o no está atendida';
  end if;

  if v_es_garantia and (v_equipo_id is null or p_solicitud_original_id is null) then
    raise exception 'Una solicitud de garantía requiere el equipo y la solicitud original';
  end if;

  insert into public.solicitudes (
    nombre, tipo_solicitud_id, detalle, cliente_id, ubicacion_id, solicitante_id,
    equipo_id, solicitud_original_id
  ) values (
    trim(p_nombre), p_tipo_solicitud_id, trim(p_detalle),
    p_cliente_id, p_ubicacion_id, v_usuario_id,
    v_equipo_id, p_solicitud_original_id
  )
  returning id, numero into v_solicitud_id, v_numero;

  v_resultado := jsonb_build_object('id', v_solicitud_id, 'numero', v_numero);

  if p_idempotencia_clave is not null then
    insert into public.idempotencia_claves(clave, usuario_id, operacion, resultado)
    values (p_idempotencia_clave, v_usuario_id, 'crear_solicitud_gestor', v_resultado)
    on conflict (clave) do nothing;
  end if;

  return v_resultado;
end;
$$;

revoke all on function public.crear_solicitud_gestor(text, uuid, uuid, uuid, text, uuid, uuid, jsonb, uuid) from public;
grant execute on function public.crear_solicitud_gestor(text, uuid, uuid, uuid, text, uuid, uuid, jsonb, uuid) to authenticated;
