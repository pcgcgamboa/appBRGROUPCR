-- Registro técnico uniforme para reglas y transacciones automáticas.
create table public.automatizacion_ejecuciones (
  id uuid primary key default gen_random_uuid(),
  correlacion_id uuid not null default gen_random_uuid(),
  regla text not null,
  origen text not null,
  solicitud_id uuid references public.solicitudes(id) on delete cascade,
  ruta_id uuid references public.rutas_proceso(id) on delete cascade,
  entidad_tipo text,
  entidad_id text,
  motivo text not null,
  accion text not null,
  resultado text not null check(resultado in ('exitoso','omitido','error')),
  detalle_resultado text not null,
  entradas jsonb not null default '{}'::jsonb,
  salidas jsonb not null default '{}'::jsonb,
  ejecutado_por uuid references public.usuarios(id) on delete set null,
  iniciado_en timestamptz not null default now(),
  finalizado_en timestamptz not null default now()
);
create index automatizacion_solicitud_idx on public.automatizacion_ejecuciones(solicitud_id,iniciado_en desc);
create index automatizacion_ruta_idx on public.automatizacion_ejecuciones(ruta_id,iniciado_en desc);
alter table public.automatizacion_ejecuciones enable row level security;
create policy automatizacion_lectura on public.automatizacion_ejecuciones for select to authenticated
using(
  public.es_gestor() or
  (solicitud_id is not null and public.puede_ver_solicitud(solicitud_id)) or
  (ruta_id is not null and exists(select 1 from public.rutas_proceso r where r.id=ruta_id and r.responsable_id=auth.uid()))
);
grant select on public.automatizacion_ejecuciones to authenticated;
revoke insert,update,delete on public.automatizacion_ejecuciones from authenticated;

create or replace function public.registrar_ejecucion_automatica(
  p_regla text,p_origen text,p_motivo text,p_accion text,p_resultado text,p_detalle text,
  p_solicitud_id uuid default null,p_ruta_id uuid default null,p_entidad_tipo text default null,
  p_entidad_id text default null,p_entradas jsonb default '{}'::jsonb,p_salidas jsonb default '{}'::jsonb,
  p_actor uuid default null,p_fecha timestamptz default now()
) returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid;
begin
  insert into public.automatizacion_ejecuciones(
    regla,origen,solicitud_id,ruta_id,entidad_tipo,entidad_id,motivo,accion,resultado,
    detalle_resultado,entradas,salidas,ejecutado_por,iniciado_en,finalizado_en
  ) values(
    p_regla,p_origen,p_solicitud_id,p_ruta_id,p_entidad_tipo,p_entidad_id,p_motivo,p_accion,
    p_resultado,p_detalle,coalesce(p_entradas,'{}'::jsonb),coalesce(p_salidas,'{}'::jsonb),
    coalesce(p_actor,auth.uid()),coalesce(p_fecha,now()),coalesce(p_fecha,now())
  ) returning id into v_id;
  return v_id;
end $$;
revoke all on function public.registrar_ejecucion_automatica(text,text,text,text,text,text,uuid,uuid,text,text,jsonb,jsonb,uuid,timestamptz) from public;

create or replace function public.trazar_automatizaciones_solicitud()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_id uuid; v_regla text; v_motivo text; v_accion text; v_detalle text; v_entradas jsonb; v_salidas jsonb;
begin
  if new.sla_vence_en is distinct from old.sla_vence_en then
    v_regla:='calculo_sla';
    v_motivo:='El tipo o la prioridad de la solicitud requiere recalcular la fecha límite de atención.';
    v_accion:='Calcular el SLA desde la fecha original de creación usando las horas configuradas.';
    v_detalle:='SLA establecido correctamente en ' || coalesce(new.sla_vence_en::text,'sin fecha límite') || '.';
    v_entradas:=jsonb_build_object('prioridad',new.prioridad,'sla_horas',new.sla_horas,'creado_en',new.creado_en);
    v_salidas:=jsonb_build_object('sla_vence_en',new.sla_vence_en);
  elsif new.atendida_en is distinct from old.atendida_en and new.atendida_en is not null then
    v_regla:='marca_atencion'; v_motivo:='La solicitud cambió al estado atendida.';
    v_accion:='Registrar automáticamente la fecha de atención.';
    v_detalle:='Fecha de atención registrada correctamente.';
    v_entradas:=jsonb_build_object('estado_anterior',old.estado,'estado_nuevo',new.estado);
    v_salidas:=jsonb_build_object('atendida_en',new.atendida_en);
  elsif new.cerrada_en is distinct from old.cerrada_en then
    v_regla:='marca_cierre_reapertura';
    v_motivo:=case when new.cerrada_en is null then 'La solicitud fue reabierta.' else 'La solicitud cambió al estado cerrada después de la validación.' end;
    v_accion:=case when new.cerrada_en is null then 'Limpiar la fecha de cierre y marcar la reapertura.' else 'Registrar automáticamente la fecha de cierre.' end;
    v_detalle:='Marcas de tiempo actualizadas correctamente.';
    v_entradas:=jsonb_build_object('estado_anterior',old.estado,'estado_nuevo',new.estado);
    v_salidas:=jsonb_build_object('cerrada_en',new.cerrada_en,'reabierta_en',new.reabierta_en);
  else return new;
  end if;
  v_id:=public.registrar_ejecucion_automatica(v_regla,'trigger:validar_cambio_solicitud',v_motivo,v_accion,
    'exitoso',v_detalle,new.id,null,'solicitudes',new.id::text,v_entradas,v_salidas,auth.uid(),now());
  perform public.registrar_actividad_solicitud(new.id,'automatizacion','Automatización: ' || replace(v_regla,'_',' '),
    'Por qué: ' || v_motivo || E'\nAcción: ' || v_accion || E'\nResultado: ' || v_detalle,
    auth.uid(),'automatizacion_ejecuciones',v_id::text,
    jsonb_build_object('regla',v_regla,'motivo',v_motivo,'accion',v_accion,'resultado','exitoso'),now());
  return new;
end $$;
create trigger trazar_automatizaciones_solicitud after update on public.solicitudes
for each row execute function public.trazar_automatizaciones_solicitud();

create or replace function public.trazar_odometro_automatico()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_id uuid; v_anterior numeric; v_motivo text; v_accion text; v_detalle text;
begin
  select kilometraje into v_anterior from public.vehiculo_kilometraje_historial
  where vehiculo_id=new.vehiculo_id and id<>new.id order by creado_en desc limit 1;
  v_motivo:='Un movimiento de ruta incluyó una lectura válida de odómetro.';
  v_accion:='Actualizar el kilometraje actual del vehículo y conservar la lectura histórica.';
  v_detalle:='Odómetro actualizado de ' || coalesce(v_anterior::text,'sin lectura previa') || ' a ' || new.kilometraje || ' km.';
  v_id:=public.registrar_ejecucion_automatica('sincronizacion_odometro','trigger:sincronizar_odometro_movimiento',
    v_motivo,v_accion,'exitoso',v_detalle,null,new.ruta_id,'vehiculo_kilometraje_historial',new.id::text,
    jsonb_build_object('kilometraje_anterior',v_anterior),jsonb_build_object('kilometraje_nuevo',new.kilometraje),
    new.registrado_por,new.creado_en);
  if new.ruta_id is not null then
    insert into public.ruta_actividades(ruta_id,tipo,titulo,descripcion,actor_id,datos,creado_en)
    values(new.ruta_id,'automatizacion','Automatización: sincronización de odómetro',
      'Por qué: ' || v_motivo || E'\nAcción: ' || v_accion || E'\nResultado: ' || v_detalle,
      new.registrado_por,jsonb_build_object('ejecucion_id',v_id,'regla','sincronizacion_odometro','resultado','exitoso'),new.creado_en);
  end if;
  return new;
end $$;
create trigger trazar_odometro_automatico after insert on public.vehiculo_kilometraje_historial
for each row execute function public.trazar_odometro_automatico();

create or replace function public.trazar_notificacion_automatica()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_id uuid; v_resultado text; v_detalle text;
begin
  v_resultado:=case new.resultado when 'enviado' then 'exitoso' when 'error' then 'error' else 'omitido' end;
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
create trigger trazar_notificacion_automatica after insert or update of resultado on public.notificaciones_envios
for each row execute function public.trazar_notificacion_automatica();

comment on table public.automatizacion_ejecuciones is
'Trazabilidad explicativa: qué regla se ejecutó, cuándo, por qué, qué hizo y con qué resultado.';
