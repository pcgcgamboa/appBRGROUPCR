-- Idempotencia para mutaciones críticas que crean filas nuevas (crear solicitud, registrar
-- avance): si el cliente reintenta la misma llamada (timeout de red, doble clic antes de que la
-- UI deshabilite el botón) con la misma clave, se devuelve el resultado ya guardado en vez de
-- duplicar la operación. La clave es opcional y por defecto null: todo el código existente que no
-- la envía sigue funcionando exactamente igual que antes.
--
-- Nota de concurrencia: el patrón "verificar luego insertar" no es perfectamente atómico ante dos
-- solicitudes verdaderamente concurrentes con la misma clave (ventana de milisegundos). Se acepta
-- como límite conocido: el caso real que esto protege es un reintento *secuencial* del mismo
-- cliente tras un timeout o error de red, no una carrera de solicitudes simultáneas.

create table public.idempotencia_claves (
  clave uuid primary key,
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  operacion text not null,
  resultado jsonb not null,
  creado_en timestamptz not null default now()
);

create index idempotencia_claves_limpieza_idx on public.idempotencia_claves(creado_en);

alter table public.idempotencia_claves enable row level security;
-- Sin políticas de lectura/escritura para `authenticated`: solo la leen/escriben las funciones
-- `security definer` de abajo, que corren con los privilegios del dueño de la función.
revoke all on public.idempotencia_claves from anon, authenticated;

comment on table public.idempotencia_claves is
  'Registro de resultados por clave de idempotencia, para que un reintento del mismo cliente no duplique una mutación crítica.';

-- crear_solicitud_portal: se agrega p_idempotencia_clave al final (default null) y se recrea la
-- función completa — no se puede usar `create or replace` porque cambiar la lista de parámetros
-- crea una sobrecarga nueva en vez de reemplazar la existente, dejando ambas versiones activas.
drop function if exists public.crear_solicitud_portal(text, uuid, uuid, text);

create function public.crear_solicitud_portal(
  p_nombre text,
  p_tipo_solicitud_id uuid,
  p_ubicacion_id uuid,
  p_detalle text,
  p_idempotencia_clave uuid default null
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

  if not exists (
    select 1 from public.tipos_solicitud
    where id = p_tipo_solicitud_id and activo
  ) then
    raise exception 'El tipo de solicitud no está disponible';
  end if;

  insert into public.solicitudes (
    nombre,
    tipo_solicitud_id,
    detalle,
    cliente_id,
    ubicacion_id,
    solicitante_id
  ) values (
    trim(p_nombre),
    p_tipo_solicitud_id,
    trim(p_detalle),
    v_cliente_id,
    p_ubicacion_id,
    v_usuario_id
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

revoke all on function public.crear_solicitud_portal(text, uuid, uuid, text, uuid) from public;
grant execute on function public.crear_solicitud_portal(text, uuid, uuid, text, uuid) to authenticated;

-- crear_solicitud_gestor: mismo tratamiento.
drop function if exists public.crear_solicitud_gestor(text, uuid, uuid, uuid, text);

create function public.crear_solicitud_gestor(
  p_nombre text,
  p_tipo_solicitud_id uuid,
  p_cliente_id uuid,
  p_ubicacion_id uuid,
  p_detalle text,
  p_idempotencia_clave uuid default null
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

  if not exists (
    select 1 from public.tipos_solicitud
    where id = p_tipo_solicitud_id and activo
  ) then
    raise exception 'El tipo de solicitud no está disponible';
  end if;

  insert into public.solicitudes (
    nombre, tipo_solicitud_id, detalle, cliente_id, ubicacion_id, solicitante_id
  ) values (
    trim(p_nombre), p_tipo_solicitud_id, trim(p_detalle),
    p_cliente_id, p_ubicacion_id, v_usuario_id
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

revoke all on function public.crear_solicitud_gestor(text, uuid, uuid, uuid, text, uuid) from public;
grant execute on function public.crear_solicitud_gestor(text, uuid, uuid, uuid, text, uuid) to authenticated;

-- registrar_avance_operador: mismo tratamiento. Es la de mayor valor práctico: el frontend ya
-- persiste un borrador local del formulario de avance (operación degradada, sesión anterior) y
-- ahora también persistirá la clave de idempotencia junto a ese borrador, así que un reintento
-- tras perder la respuesta (señal débil en campo) no duplica el avance ni sus adjuntos.
drop function if exists public.registrar_avance_operador(
  uuid, numeric, smallint, text, public.estado_solicitud, jsonb, jsonb
);

create function public.registrar_avance_operador(
  p_solicitud_id uuid,
  p_horas_trabajadas numeric,
  p_porcentaje smallint,
  p_narrativa text,
  p_estado_nuevo public.estado_solicitud,
  p_materiales jsonb,
  p_adjuntos jsonb,
  p_idempotencia_clave uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = '' as $$
declare
  v_usuario_id uuid := auth.uid();
  v_estado_actual public.estado_solicitud;
  v_vehiculo_id uuid;
  v_avance_id uuid;
  v_item jsonb;
  v_material_id uuid;
  v_nombre text;
  v_unidad text;
  v_resultado jsonb;
begin
  if p_idempotencia_clave is not null then
    select resultado into v_resultado
    from public.idempotencia_claves where clave = p_idempotencia_clave;
    if v_resultado is not null then
      return (v_resultado ->> 'avance_id')::uuid;
    end if;
  end if;

  if v_usuario_id is null or not public.tiene_rol('operador', v_usuario_id) then
    raise exception 'Se requiere el rol Operador';
  end if;

  select s.estado, r.vehiculo_id
  into v_estado_actual, v_vehiculo_id
  from public.solicitudes s
  left join public.rutas r on r.solicitud_id = s.id
  where s.id = p_solicitud_id and s.operador_id = v_usuario_id;

  if not found then
    raise exception 'La solicitud no está asignada al operador autenticado';
  end if;

  if v_vehiculo_id is null then
    raise exception 'La solicitud requiere un vehículo definido en el control de ruta';
  end if;

  if v_estado_actual not in ('asignada', 'en_atencion', 'en_espera_materiales') then
    raise exception 'La solicitud no admite avances en su estado actual';
  end if;

  if not (
    (v_estado_actual = 'asignada' and p_estado_nuevo = 'en_atencion')
    or (v_estado_actual = 'en_atencion' and p_estado_nuevo in ('en_atencion', 'en_espera_materiales', 'atendida'))
    or (v_estado_actual = 'en_espera_materiales' and p_estado_nuevo in ('en_espera_materiales', 'en_atencion', 'atendida'))
  ) then
    raise exception 'Transición de estado no permitida para el Operador';
  end if;

  if p_horas_trabajadas <= 0 or p_horas_trabajadas > 24 then
    raise exception 'Las horas trabajadas deben ser mayores que cero y no superar 24';
  end if;

  if p_porcentaje < 0 or p_porcentaje > 100 then
    raise exception 'El porcentaje debe estar entre 0 y 100';
  end if;

  if p_porcentaje < coalesce((
    select max(a.porcentaje) from public.avances a where a.solicitud_id = p_solicitud_id
  ), 0) then
    raise exception 'El porcentaje no puede ser menor que un avance anterior';
  end if;

  if p_estado_nuevo = 'atendida' and p_porcentaje <> 100 then
    raise exception 'Una solicitud atendida debe registrar 100 por ciento de avance';
  end if;

  if length(trim(p_narrativa)) < 5 then
    raise exception 'La narrativa debe contener al menos 5 caracteres';
  end if;

  insert into public.avances (
    solicitud_id, operador_id, vehiculo_id, horas_trabajadas, porcentaje, narrativa
  ) values (
    p_solicitud_id, v_usuario_id, v_vehiculo_id,
    p_horas_trabajadas, p_porcentaje, trim(p_narrativa)
  ) returning id into v_avance_id;

  for v_item in select value from jsonb_array_elements(coalesce(p_materiales, '[]'::jsonb))
  loop
    v_material_id := nullif(v_item ->> 'material_id', '')::uuid;

    if v_material_id is null then
      v_nombre := trim(v_item ->> 'nombre');
      v_unidad := trim(v_item ->> 'unidad_medida');
      if length(v_nombre) = 0 or length(v_unidad) = 0 then
        raise exception 'Nombre y unidad son obligatorios para materiales nuevos';
      end if;

      select m.id into v_material_id
      from public.materiales m
      where lower(m.nombre) = lower(v_nombre) and lower(m.unidad_medida) = lower(v_unidad)
      limit 1;

      if v_material_id is null then
        begin
          insert into public.materiales (
            nombre, descripcion, unidad_medida, costo_referencial, creado_por
          ) values (
            v_nombre, nullif(trim(v_item ->> 'descripcion'), ''), v_unidad,
            nullif(v_item ->> 'costo_referencial', '')::numeric, v_usuario_id
          ) returning id into v_material_id;
        exception when unique_violation then
          select m.id into v_material_id
          from public.materiales m
          where lower(m.nombre) = lower(v_nombre) and lower(m.unidad_medida) = lower(v_unidad)
          limit 1;
        end;
      end if;
    elsif not exists (select 1 from public.materiales m where m.id = v_material_id and m.activo) then
      raise exception 'El material seleccionado no existe o está inactivo';
    end if;

    insert into public.solicitud_materiales (
      solicitud_id, avance_id, material_id, cantidad,
      costo_referencial_aplicado, registrado_por
    ) values (
      p_solicitud_id, v_avance_id, v_material_id,
      (v_item ->> 'cantidad')::numeric,
      nullif(v_item ->> 'costo_referencial', '')::numeric,
      v_usuario_id
    );
  end loop;

  for v_item in select value from jsonb_array_elements(coalesce(p_adjuntos, '[]'::jsonb))
  loop
    if split_part(v_item ->> 'ruta_storage', '/', 1) <> p_solicitud_id::text then
      raise exception 'La ruta del adjunto no corresponde a la solicitud';
    end if;

    insert into public.adjuntos (
      id, solicitud_id, avance_id, subido_por, nombre_archivo,
      ruta_storage, tipo, mime_type, tamano_bytes
    ) values (
      (v_item ->> 'id')::uuid, p_solicitud_id, v_avance_id, v_usuario_id,
      v_item ->> 'nombre_archivo', v_item ->> 'ruta_storage',
      (v_item ->> 'tipo')::public.tipo_adjunto,
      v_item ->> 'mime_type', (v_item ->> 'tamano_bytes')::bigint
    );
  end loop;

  if p_estado_nuevo <> v_estado_actual then
    update public.solicitudes set estado = p_estado_nuevo where id = p_solicitud_id;
  end if;

  if p_idempotencia_clave is not null then
    insert into public.idempotencia_claves(clave, usuario_id, operacion, resultado)
    values (
      p_idempotencia_clave, v_usuario_id, 'registrar_avance_operador',
      jsonb_build_object('avance_id', v_avance_id)
    )
    on conflict (clave) do nothing;
  end if;

  return v_avance_id;
end;
$$;

revoke all on function public.registrar_avance_operador(
  uuid, numeric, smallint, text, public.estado_solicitud, jsonb, jsonb, uuid
) from public;

grant execute on function public.registrar_avance_operador(
  uuid, numeric, smallint, text, public.estado_solicitud, jsonb, jsonb, uuid
) to authenticated;
