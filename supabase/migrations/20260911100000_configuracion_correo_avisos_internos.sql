-- Mecanismo de correo: interruptor global (reemplaza notificaciones_config, que se activaba
-- solicitud por solicitud y nacía apagado en cada una), modo de envío (clientes reales vs. cuenta
-- de soporte) y avisos por correo cuando llega una solicitud nueva o una postulación de técnico
-- nueva (antes solo quedaban en el feed interno notificaciones_internas, sin correo).

-- 1. Configuración singleton de correo (mismo patrón que configuracion_operativa).
create table public.configuracion_correo (
  id boolean primary key default true check (id),
  notificar_cliente_activo boolean not null default true,
  modo_envio text not null default 'clientes' check (modo_envio in ('clientes', 'soporte')),
  correo_soporte text not null default 'servicioclientebr@gmail.com'
    check (correo_soporte ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  actualizado_por uuid references public.usuarios(id) on delete set null,
  actualizado_en timestamptz not null default now()
);
insert into public.configuracion_correo (id) values (true) on conflict (id) do nothing;
alter table public.configuracion_correo enable row level security;
create policy configuracion_correo_lectura on public.configuracion_correo
  for select to authenticated using (true);
create policy configuracion_correo_gestion on public.configuracion_correo
  for update to authenticated using (public.tiene_rol('administrador'))
  with check (public.tiene_rol('administrador'));
grant select, update on public.configuracion_correo to authenticated;

-- 2. La config por-solicitud queda reemplazada por el interruptor global de arriba. Solo contenía
-- flags (activa/inactiva por estado), sin valor de auditoría — la auditoría real de envíos vive en
-- notificaciones_envios, que no se toca en su historial.
drop table public.notificaciones_config;

-- 3. Generaliza notificaciones_envios para que sirva de outbox también a los avisos internos
-- (solicitud nueva, postulación nueva), reutilizando el mismo cron/reintento/transporte SMTP en vez
-- de duplicar el mecanismo. Los avisos internos se componen en SQL, solo texto plano (sin HTML,
-- para no reimplementar el escape de _shared/notificaciones.ts dentro de PL/pgSQL).
alter table public.notificaciones_envios
  alter column solicitud_id drop not null,
  alter column estado drop not null,
  add column tipo text not null default 'cliente_estado' check (tipo in ('cliente_estado', 'aviso_interno')),
  add column asunto text,
  add column cuerpo_texto text,
  add constraint notificaciones_envios_cliente_estado_chk
    check (tipo <> 'cliente_estado' or (solicitud_id is not null and estado is not null)),
  add constraint notificaciones_envios_aviso_interno_chk
    check (tipo <> 'aviso_interno' or (asunto is not null and cuerpo_texto is not null));

-- Se reemplaza por completo: antes usaba `join` (asumía solicitud_id siempre presente); ahora usa
-- `left join` porque los avisos internos no tienen solicitud asociada, y devuelve las columnas
-- nuevas (tipo, asunto, cuerpo_texto) que _shared/notificaciones.ts necesita para bifurcar el envío.
-- Postgres no permite `create or replace` cuando cambian las columnas de retorno de la función
-- (el tipo definido por los parámetros OUT es distinto) — hay que borrarla primero.
drop function public.reclamar_notificaciones_pendientes(integer);
create function public.reclamar_notificaciones_pendientes(p_limite integer default 20)
returns table (
  id uuid,
  tipo text,
  destinatario text,
  estado text,
  numero bigint,
  nombre text,
  cliente_nombre text,
  asunto text,
  cuerpo_texto text
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  with elegidas as (
    select ne.id
    from public.notificaciones_envios ne
    where ne.resultado in ('pendiente', 'error')
      and ne.intentos < 3
      and (ne.siguiente_intento_en is null or ne.siguiente_intento_en <= now())
    order by ne.creado_en
    limit p_limite
    for update of ne skip locked
  ),
  actualizadas as (
    update public.notificaciones_envios n
    set intentos = n.intentos + 1,
        siguiente_intento_en = now() + (least(n.intentos, 3) * interval '5 minutes')
    from elegidas
    where n.id = elegidas.id
    returning n.id, n.tipo, n.destinatario, n.estado, n.solicitud_id, n.asunto, n.cuerpo_texto
  )
  select a.id, a.tipo, a.destinatario, a.estado::text, s.numero, s.nombre, c.nombre, a.asunto, a.cuerpo_texto
  from actualizadas a
  left join public.solicitudes s on s.id = a.solicitud_id
  left join public.clientes c on c.id = s.cliente_id;
end $$;

revoke all on function public.reclamar_notificaciones_pendientes(integer) from public;
grant execute on function public.reclamar_notificaciones_pendientes(integer) to service_role;

-- 4. Aviso interno por correo al llegar una solicitud nueva (hoy no dispara nada, ni correo ni
-- feed interno). No depende de notificar_cliente_activo (ese flag es solo para el cliente en
-- cambios de estado) ni del modo_envio (los avisos internos siempre van a correo_soporte).
create or replace function public.avisar_solicitud_nueva()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_correo text;
  v_cliente text;
begin
  select correo_soporte into v_correo from public.configuracion_correo where id = true;
  if v_correo is null then
    return new;
  end if;
  select nombre into v_cliente from public.clientes where id = new.cliente_id;
  insert into public.notificaciones_envios (tipo, solicitud_id, destinatario, resultado, asunto, cuerpo_texto)
  values (
    'aviso_interno',
    new.id,
    v_correo,
    'pendiente',
    concat('Nueva solicitud #', new.numero, ': ', new.nombre),
    concat('Se registró la solicitud #', new.numero, ' (', new.nombre, ') del cliente ', coalesce(v_cliente, '—'), '.')
  );
  return new;
end $$;
create trigger avisar_solicitud_nueva after insert on public.solicitudes
for each row execute function public.avisar_solicitud_nueva();

-- 5. Extiende el trigger existente de postulaciones (sin tocar su inserción en
-- notificaciones_internas): agrega el aviso por correo solo en INSERT (postulación nueva), no en
-- cada cambio de estado de revisión.
create or replace function public.notificar_cambio_bolsa_empleo()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_correo text;
begin
  insert into public.notificaciones_internas (tipo, titulo, mensaje, entidad_tipo, entidad_id, roles_destino)
  values (
    'bolsa_empleo',
    case when tg_op = 'INSERT' then 'Nueva postulación en bolsa de empleo' else 'Postulación actualizada' end,
    new.nombre_completo || ' · ' || new.especialidad || ' · estado ' || new.estado || '.',
    'postulaciones_tecnicos',
    new.id::text,
    array['administrador', 'encargado']
  );

  if tg_op = 'INSERT' then
    select correo_soporte into v_correo from public.configuracion_correo where id = true;
    if v_correo is not null then
      insert into public.notificaciones_envios (tipo, destinatario, resultado, asunto, cuerpo_texto)
      values (
        'aviso_interno',
        v_correo,
        'pendiente',
        concat('Nueva postulación: ', new.nombre_completo, ' (', new.especialidad, ')'),
        concat(
          'Nombre: ', new.nombre_completo, chr(10),
          'Especialidad: ', new.especialidad, chr(10),
          'Celular: ', new.celular, chr(10),
          'Correo: ', coalesce(new.correo, 'no indicado'), chr(10),
          'Provincia/Cantón: ', new.provincia, ' / ', new.canton
        )
      );
    end if;
  end if;

  return new;
end $$;
-- El trigger ya existe (after insert or update of estado on postulaciones_tecnicos) y no se
-- recrea: create or replace function alcanza para que use la lógica nueva.

-- 6. trazar_notificacion_automatica (20260821160000_trazabilidad_automatizaciones.sql:114-134) es
-- un trigger AFTER INSERT OR UPDATE OF resultado on notificaciones_envios ya existente, no
-- descubierto durante la exploración inicial de este cambio: construye `motivo` concatenando
-- `replace(new.estado::text,'_',' ')` sin condicionar por tipo, y `estado` ahora es nulo para
-- `tipo='aviso_interno'` — con Postgres, `||` con un operando null devuelve null, así que `motivo`
-- (columna not null de automatizacion_ejecuciones) llegaba null y rompía el insert. También llama a
-- registrar_actividad_solicitud(new.solicitud_id, ...), y esa función inserta en
-- solicitud_actividades, donde solicitud_id es not null — falla igual para el aviso de postulación
-- nueva, que no tiene solicitud asociada. Se agrega un branch para 'aviso_interno' que compone su
-- propio motivo/detalle a partir de asunto/resultado, y solo llama a registrar_actividad_solicitud
-- cuando sí hay solicitud_id (el caso de solicitud nueva; no el de postulación nueva).
create or replace function public.trazar_notificacion_automatica()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_id uuid; v_resultado text; v_regla text; v_motivo text; v_accion text; v_detalle text;
begin
  v_resultado:=case new.resultado when 'enviado' then 'exitoso' when 'error' then 'error' else 'omitido' end;

  if new.tipo = 'aviso_interno' then
    v_regla:='aviso_interno_correo';
    v_motivo:='Se generó un aviso interno para el correo de soporte: ' || coalesce(new.asunto, 'sin asunto') || '.';
    v_accion:='Generar y enviar un correo a la cuenta de soporte configurada.';
    v_detalle:=case new.resultado when 'enviado' then 'Correo enviado correctamente a ' || new.destinatario || '.'
      when 'error' then 'El envío falló: ' || coalesce(new.detalle_error, 'sin detalle del proveedor')
      else 'El envío quedó pendiente de procesamiento.' end;
    v_id:=public.registrar_ejecucion_automatica(v_regla, 'trigger:aviso_interno', v_motivo, v_accion, v_resultado,
      v_detalle, new.solicitud_id, null, 'notificaciones_envios', new.id::text,
      jsonb_build_object('asunto', new.asunto, 'destinatario', new.destinatario),
      jsonb_build_object('estado_envio', new.resultado, 'error', new.detalle_error), null,
      coalesce(new.enviado_en, new.creado_en));
    if new.solicitud_id is not null then
      perform public.registrar_actividad_solicitud(new.solicitud_id, 'automatizacion',
        'Automatización: aviso interno de correo',
        'Por qué: ' || v_motivo || E'\nAcción: ' || v_accion || E'\nResultado: ' || v_detalle,
        null, 'automatizacion_ejecuciones', v_id::text,
        jsonb_build_object('regla', v_regla, 'resultado', v_resultado), coalesce(new.enviado_en, new.creado_en));
    end if;
    return new;
  end if;

  v_detalle:=case new.resultado when 'enviado' then 'Correo enviado correctamente a ' || new.destinatario || '.'
    when 'error' then 'El envío falló: ' || coalesce(new.detalle_error,'sin detalle del proveedor')
    else 'El envío quedó pendiente de procesamiento.' end;
  v_id:=public.registrar_ejecucion_automatica('notificacion_cambio_estado','edge:notificaciones',
    'La configuración de la solicitud activó una notificación para el estado ' || replace(new.estado::text,'_',' ') || '.',
    'Generar y enviar un correo al contacto configurado.',v_resultado,v_detalle,new.solicitud_id,null,
    'notificaciones_envios',new.id::text,jsonb_build_object('estado_solicitud',new.estado,'destinatario',new.destinatario),
    jsonb_build_object('estado_envio',new.resultado,'error',new.detalle_error),null,coalesce(new.enviado_en,new.creado_en));
  perform public.registrar_actividad_solicitud(new.solicitud_id,'automatizacion','Automatización: notificación al Cliente',
    'Por qué: cambio al estado ' || replace(new.estado::text,'_',' ') || E'.\nAcción: enviar correo a ' || new.destinatario || E'.\nResultado: ' || v_detalle,
    null,'automatizacion_ejecuciones',v_id::text,
    jsonb_build_object('regla','notificacion_cambio_estado','resultado',v_resultado),coalesce(new.enviado_en,new.creado_en));
  return new;
end $$;
