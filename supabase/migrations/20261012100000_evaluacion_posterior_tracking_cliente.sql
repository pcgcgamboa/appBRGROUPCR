-- Portal del Cliente: evaluación posterior al cierre, tracking sin movimientos internos y
-- documentos sin proformas/facturas.

-- 1. El cierre ya no espera la validación del Cliente: el proveedor cierra desde 'atendida' y la
--    evaluación de satisfacción se pide después (opcional, no bloquea). Se recrea la función sin
--    el chequeo de validaciones_cierre; el resto del comportamiento queda igual.
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

-- 2. La evaluación se registra sobre solicitudes ya cerradas (antes: solo 'atendida').
drop policy if exists validaciones_crear on public.validaciones_cierre;
create policy validaciones_crear on public.validaciones_cierre for insert to authenticated
with check (
  cliente_usuario_id = auth.uid() and public.tiene_rol('cliente')
  and exists (
    select 1 from public.solicitudes s
    where s.id = solicitud_id and s.cliente_id = public.cliente_del_usuario()
      and s.estado = 'cerrada'
  )
);
drop policy if exists validaciones_actualizar on public.validaciones_cierre;
create policy validaciones_actualizar on public.validaciones_cierre for update to authenticated
using (
  cliente_usuario_id = auth.uid()
  and exists (select 1 from public.solicitudes s where s.id = solicitud_id and s.estado = 'cerrada')
)
with check (cliente_usuario_id = auth.uid());

-- Una evaluación "no satisfecho" avisa a Administrador/Encargado en sus notificaciones internas.
create or replace function public.notificar_evaluacion_insatisfecha()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_numero bigint; v_nombre text;
begin
  if not new.satisfecho and (tg_op = 'INSERT' or old.satisfecho) then
    select numero, nombre into v_numero, v_nombre from public.solicitudes where id = new.solicitud_id;
    insert into public.notificaciones_internas (tipo, titulo, mensaje, entidad_tipo, entidad_id)
    values (
      'cliente',
      'Cliente no satisfecho con la solicitud #' || v_numero,
      coalesce(v_nombre, '') || coalesce(' — ' || nullif(trim(new.comentario), ''), ''),
      'solicitud',
      new.solicitud_id::text
    );
  end if;
  return new;
end $$;
create trigger notificar_evaluacion_insatisfecha
after insert or update of satisfecho on public.validaciones_cierre
for each row execute function public.notificar_evaluacion_insatisfecha();

-- 3. El Cliente (y el solicitante) solo ven en el tracking los movimientos que le conciernen;
--    asignaciones, rutas, flota, técnicos, materiales, peticiones internas, ediciones y
--    automatizaciones quedan para el proveedor. Gestores y operadores siguen viendo todo.
drop policy if exists solicitud_actividades_lectura on public.solicitud_actividades;
create policy solicitud_actividades_lectura on public.solicitud_actividades
for select to authenticated using (
  public.puede_ver_solicitud(solicitud_id)
  and (
    public.es_gestor() or public.tiene_rol('operador')
    or tipo in ('estado', 'avance', 'adjunto', 'comunicacion', 'proforma', 'visita',
                'garantia', 'validacion')
  )
);

-- 4. Mensajes de la solicitud: el Cliente escribe al proveedor, pero solo mensajes; las
--    proformas las emite el proveedor (gestores; el operador asignado conserva su permiso).
drop policy if exists comunicaciones_crear on public.solicitud_comunicaciones;
create policy comunicaciones_crear on public.solicitud_comunicaciones for insert to authenticated
with check (
  enviado_por = auth.uid() and public.puede_ver_solicitud(solicitud_id) and (
    public.es_gestor()
    or exists (
      select 1 from public.solicitudes s where s.id = solicitud_id and s.operador_id = auth.uid()
    )
    or (public.tiene_rol('cliente') and tipo = 'mensaje')
  )
);

-- 5. El Cliente no sube proformas ni facturas a su expediente (las aporta el proveedor).
drop policy if exists cliente_documentos_crear on public.cliente_documentos;
create policy cliente_documentos_crear on public.cliente_documentos for insert to authenticated
with check (
  subido_por = auth.uid() and (
    public.es_gestor()
    or (cliente_id = public.cliente_del_usuario() and tipo not in ('factura', 'proforma'))
  )
);
