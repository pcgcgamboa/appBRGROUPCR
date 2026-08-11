create table public.solicitud_peticiones_resolucion (
  id uuid primary key default gen_random_uuid(),
  solicitud_id uuid not null references public.solicitudes(id) on delete cascade,
  tipo text not null check (tipo in ('cierre', 'cancelacion')),
  motivo text not null check (length(trim(motivo)) >= 5),
  estado text not null default 'pendiente' check (estado in ('pendiente', 'aprobada', 'rechazada')),
  solicitado_por uuid not null references public.usuarios(id) on delete restrict,
  creado_en timestamptz not null default now(),
  resuelto_por uuid references public.usuarios(id) on delete restrict,
  comentario_resolucion text,
  resuelto_en timestamptz,
  check (
    (estado = 'pendiente' and resuelto_por is null and resuelto_en is null)
    or (estado <> 'pendiente' and resuelto_por is not null and resuelto_en is not null)
  )
);

create unique index solicitud_peticion_pendiente_unica
on public.solicitud_peticiones_resolucion (solicitud_id)
where estado = 'pendiente';

alter table public.solicitud_peticiones_resolucion enable row level security;

create policy peticiones_resolucion_lectura
on public.solicitud_peticiones_resolucion for select to authenticated
using (solicitado_por = auth.uid() or public.es_gestor());

grant select on public.solicitud_peticiones_resolucion to authenticated;

create or replace function public.solicitar_resolucion_solicitud(
  p_solicitud_id uuid,
  p_tipo text,
  p_motivo text
)
returns uuid
language plpgsql
security definer
set search_path = '' as $$
declare
  v_usuario uuid := auth.uid();
  v_estado public.estado_solicitud;
  v_id uuid;
begin
  if v_usuario is null or not public.tiene_rol('operador', v_usuario) then
    raise exception 'Se requiere el rol Operador';
  end if;
  if p_tipo not in ('cierre', 'cancelacion') then
    raise exception 'Tipo de petición no válido';
  end if;
  if length(trim(coalesce(p_motivo, ''))) < 5 then
    raise exception 'Indique un motivo de al menos 5 caracteres';
  end if;

  select s.estado into v_estado
  from public.solicitudes s
  where s.id = p_solicitud_id and s.operador_id = v_usuario;
  if not found then
    raise exception 'La solicitud no está asignada al operador autenticado';
  end if;
  if p_tipo = 'cierre' and v_estado <> 'atendida' then
    raise exception 'La solicitud debe estar atendida antes de solicitar el cierre';
  end if;
  if p_tipo = 'cancelacion' and v_estado not in ('asignada', 'en_atencion', 'en_espera_materiales', 'atendida') then
    raise exception 'La solicitud no admite cancelación en su estado actual';
  end if;

  insert into public.solicitud_peticiones_resolucion (
    solicitud_id, tipo, motivo, solicitado_por
  ) values (
    p_solicitud_id, p_tipo, trim(p_motivo), v_usuario
  ) returning id into v_id;
  return v_id;
exception when unique_violation then
  raise exception 'Ya existe una petición pendiente para esta solicitud';
end;
$$;

create or replace function public.resolver_peticion_solicitud(
  p_peticion_id uuid,
  p_aprobar boolean,
  p_comentario text default null
)
returns uuid
language plpgsql
security definer
set search_path = '' as $$
declare
  v_usuario uuid := auth.uid();
  v_peticion public.solicitud_peticiones_resolucion%rowtype;
begin
  if v_usuario is null or not public.es_gestor(v_usuario) then
    raise exception 'Solo un Encargado de Proceso o Administrador puede resolver peticiones';
  end if;
  select * into v_peticion
  from public.solicitud_peticiones_resolucion
  where id = p_peticion_id
  for update;
  if not found or v_peticion.estado <> 'pendiente' then
    raise exception 'La petición no existe o ya fue resuelta';
  end if;
  if not p_aprobar and length(trim(coalesce(p_comentario, ''))) < 5 then
    raise exception 'Indique el motivo del rechazo';
  end if;

  if p_aprobar then
    if v_peticion.tipo = 'cierre' then
      update public.solicitudes set estado = 'cerrada'
      where id = v_peticion.solicitud_id and estado = 'atendida';
    else
      update public.solicitudes
      set estado = 'cancelada', motivo_rechazo_cancelacion = v_peticion.motivo
      where id = v_peticion.solicitud_id
        and estado in ('asignada', 'en_atencion', 'en_espera_materiales', 'atendida');
    end if;
    if not found then
      raise exception 'El estado actual de la solicitud ya no permite aprobar la petición';
    end if;
  end if;

  update public.solicitud_peticiones_resolucion
  set estado = case when p_aprobar then 'aprobada' else 'rechazada' end,
      resuelto_por = v_usuario,
      comentario_resolucion = nullif(trim(coalesce(p_comentario, '')), ''),
      resuelto_en = now()
  where id = p_peticion_id;
  return v_peticion.solicitud_id;
end;
$$;

revoke all on function public.solicitar_resolucion_solicitud(uuid, text, text) from public;
revoke all on function public.resolver_peticion_solicitud(uuid, boolean, text) from public;
grant execute on function public.solicitar_resolucion_solicitud(uuid, text, text) to authenticated;
grant execute on function public.resolver_peticion_solicitud(uuid, boolean, text) to authenticated;
