-- Reporte de atención en PDF: checklist/estado final/firmas capturados al "Registrar avance",
-- plantilla por cliente (qué secciones opcionales incluir), encuesta de satisfacción ampliada, y
-- categorías de foto. La relación solicitud↔reporte queda dada por reportes_atencion.avance_id ->
-- avances.solicitud_id (no se duplica equipo_id/motivo_visita: se leen de la propia solicitud).

create type public.estado_equipo_final as enum ('funcionando', 'parcial', 'sin_funcionar');

create table public.reportes_atencion (
  id uuid primary key default gen_random_uuid(),
  avance_id uuid not null unique references public.avances(id) on delete cascade,
  hora_llegada timestamptz,
  hora_salida timestamptz,
  checklist_area_trabajo_segura boolean not null default false,
  checklist_equipo_probado boolean not null default false,
  checklist_cliente_capacitado boolean not null default false,
  checklist_requiere_seguimiento boolean not null default false,
  checklist_notas text,
  estado_equipo_final public.estado_equipo_final not null,
  recomendaciones text,
  firma_tecnico text not null,
  firma_cliente text not null,
  cedula_cliente_firma text not null,
  ruta_storage_pdf text,
  nombre_archivo_pdf text,
  creado_por uuid not null references public.usuarios(id) on delete restrict,
  creado_en timestamptz not null default now(),
  check (length(trim(cedula_cliente_firma)) > 0)
);

alter table public.reportes_atencion enable row level security;

create policy reportes_atencion_lectura on public.reportes_atencion for select to authenticated
using (
  exists (
    select 1 from public.avances a
    where a.id = avance_id and public.puede_ver_solicitud(a.solicitud_id)
  )
);

create policy reportes_atencion_crear on public.reportes_atencion for insert to authenticated
with check (
  creado_por = auth.uid()
  and public.tiene_rol('operador')
  and exists (select 1 from public.avances a where a.id = avance_id and a.operador_id = auth.uid())
);

-- Permite completar ruta_storage_pdf/nombre_archivo_pdf después de generar el PDF (el preview no
-- los llena todavía, ver service-report-preview-dialog.tsx) sin necesitar una función nueva.
create policy reportes_atencion_actualizar on public.reportes_atencion for update to authenticated
using (creado_por = auth.uid())
with check (creado_por = auth.uid());

comment on table public.reportes_atencion is
  'Reporte de atención (checklist, estado final del equipo, firmas, PDF) de un avance puntual.';

-- Categoría de foto fija en código (no configurable por el administrador) — null para adjuntos
-- normales, una de la lista fija cuando el adjunto pertenece al reporte de atención.
alter table public.adjuntos add column categoria text;

-- Plantilla de reporte por cliente: cuáles de las secciones opcionales incluir y qué categorías de
-- foto están habilitadas para ese cliente. Datos generales/equipo, trabajos realizados y estado
-- final/firmas siempre se incluyen — son el núcleo del reporte, no son desactivables.
create table public.clientes_plantilla_reporte (
  cliente_id uuid primary key references public.clientes(id) on delete cascade,
  incluir_motivo_visita boolean not null default true,
  incluir_checklist_condiciones boolean not null default true,
  incluir_fotos_categorizadas boolean not null default true,
  incluir_recomendaciones boolean not null default true,
  categorias_fotos_habilitadas text[] not null default array[
    'estado_inicial', 'trabajo_en_proceso', 'resultado_final', 'placa_serie', 'otro'
  ],
  actualizado_en timestamptz not null default now()
);

alter table public.clientes_plantilla_reporte enable row level security;

create policy clientes_plantilla_reporte_lectura on public.clientes_plantilla_reporte
for select to authenticated
using (public.es_gestor() or cliente_id = public.cliente_del_usuario());

create policy clientes_plantilla_reporte_gestion on public.clientes_plantilla_reporte
for all to authenticated
using (public.tiene_rol('administrador')) with check (public.tiene_rol('administrador'));

create trigger clientes_plantilla_reporte_actualizado before update on public.clientes_plantilla_reporte
for each row execute function public.actualizar_marca_tiempo();

comment on table public.clientes_plantilla_reporte is
  'Secciones opcionales y categorías de foto habilitadas en el PDF de reporte de atención, por cliente.';

-- Encuesta de satisfacción ampliada: se mantiene satisfecho/comentario tal cual, se agregan 3
-- preguntas fijas más. Nullable porque las filas existentes no las tienen y la encuesta ampliada
-- no aplica retroactivamente.
alter table public.validaciones_cierre add column calificacion smallint;
alter table public.validaciones_cierre add column llego_a_tiempo boolean;
alter table public.validaciones_cierre add column recomendaria_tecnico boolean;
alter table public.validaciones_cierre add constraint validaciones_cierre_calificacion_check
  check (calificacion is null or calificacion between 1 and 5);

-- registrar_avance_operador: se agrega p_reporte jsonb opcional para insertar reportes_atencion en
-- la misma transacción del avance cuando el operador activa "Generar reporte de atención".
drop function if exists public.registrar_avance_operador(
  uuid, numeric, smallint, text, public.estado_solicitud, jsonb, jsonb, uuid
);

create function public.registrar_avance_operador(
  p_solicitud_id uuid,
  p_horas_trabajadas numeric,
  p_porcentaje smallint,
  p_narrativa text,
  p_estado_nuevo public.estado_solicitud,
  p_materiales jsonb,
  p_adjuntos jsonb,
  p_idempotencia_clave uuid default null,
  p_reporte jsonb default null
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
      ruta_storage, tipo, mime_type, tamano_bytes, categoria
    ) values (
      (v_item ->> 'id')::uuid, p_solicitud_id, v_avance_id, v_usuario_id,
      v_item ->> 'nombre_archivo', v_item ->> 'ruta_storage',
      (v_item ->> 'tipo')::public.tipo_adjunto,
      v_item ->> 'mime_type', (v_item ->> 'tamano_bytes')::bigint,
      nullif(v_item ->> 'categoria', '')
    );
  end loop;

  if p_reporte is not null then
    if nullif(trim(p_reporte ->> 'firma_tecnico'), '') is null
      or nullif(trim(p_reporte ->> 'firma_cliente'), '') is null
      or nullif(trim(p_reporte ->> 'cedula_cliente_firma'), '') is null
      or nullif(trim(p_reporte ->> 'estado_equipo_final'), '') is null
    then
      raise exception 'El reporte de atención requiere ambas firmas, la cédula y el estado del equipo';
    end if;

    insert into public.reportes_atencion (
      avance_id, hora_llegada, hora_salida,
      checklist_area_trabajo_segura, checklist_equipo_probado,
      checklist_cliente_capacitado, checklist_requiere_seguimiento, checklist_notas,
      estado_equipo_final, recomendaciones,
      firma_tecnico, firma_cliente, cedula_cliente_firma, creado_por
    ) values (
      v_avance_id,
      nullif(p_reporte ->> 'hora_llegada', '')::timestamptz,
      nullif(p_reporte ->> 'hora_salida', '')::timestamptz,
      coalesce((p_reporte ->> 'checklist_area_trabajo_segura')::boolean, false),
      coalesce((p_reporte ->> 'checklist_equipo_probado')::boolean, false),
      coalesce((p_reporte ->> 'checklist_cliente_capacitado')::boolean, false),
      coalesce((p_reporte ->> 'checklist_requiere_seguimiento')::boolean, false),
      nullif(trim(p_reporte ->> 'checklist_notas'), ''),
      (p_reporte ->> 'estado_equipo_final')::public.estado_equipo_final,
      nullif(trim(p_reporte ->> 'recomendaciones'), ''),
      trim(p_reporte ->> 'firma_tecnico'), trim(p_reporte ->> 'firma_cliente'),
      trim(p_reporte ->> 'cedula_cliente_firma'), v_usuario_id
    );
  end if;

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
  uuid, numeric, smallint, text, public.estado_solicitud, jsonb, jsonb, uuid, jsonb
) from public;

grant execute on function public.registrar_avance_operador(
  uuid, numeric, smallint, text, public.estado_solicitud, jsonb, jsonb, uuid, jsonb
) to authenticated;

-- Bucket para los PDF generados (privado, mismo patrón que solicitudes-adjuntos). Ruta:
-- `${solicitud_id}/${reporte_id}.pdf` para poder validar con puede_ver_solicitud sobre el primer
-- segmento de la ruta, igual que ya hace storage_adjuntos_*.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('reportes-servicio', 'reportes-servicio', false, 10485760, array['application/pdf'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy storage_reportes_lectura on storage.objects for select to authenticated
using (
  bucket_id = 'reportes-servicio'
  and public.puede_ver_solicitud(((storage.foldername(name))[1])::uuid)
);
create policy storage_reportes_crear on storage.objects for insert to authenticated
with check (
  bucket_id = 'reportes-servicio'
  and owner_id = auth.uid()::text
  and public.puede_ver_solicitud(((storage.foldername(name))[1])::uuid)
);
create policy storage_reportes_actualizar on storage.objects for update to authenticated
using (bucket_id = 'reportes-servicio' and owner_id = auth.uid()::text)
with check (bucket_id = 'reportes-servicio' and owner_id = auth.uid()::text);
