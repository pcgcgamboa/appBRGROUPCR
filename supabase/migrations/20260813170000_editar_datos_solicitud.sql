create table public.solicitud_ediciones_auditoria (
  id bigint generated always as identity primary key,
  solicitud_id uuid not null references public.solicitudes(id) on delete cascade,
  editado_por uuid references public.usuarios(id) on delete set null,
  datos_anteriores jsonb not null,
  datos_nuevos jsonb not null,
  creado_en timestamptz not null default now()
);
alter table public.solicitud_ediciones_auditoria enable row level security;
create policy ediciones_lectura on public.solicitud_ediciones_auditoria for select to authenticated
using(public.es_gestor());
grant select on public.solicitud_ediciones_auditoria to authenticated;

create or replace function public.editar_datos_solicitud(
  p_solicitud_id uuid, p_nombre text, p_detalle text, p_cliente_id uuid,
  p_ubicacion_id uuid, p_tipo_solicitud_id uuid, p_prioridad public.prioridad_solicitud
) returns void language plpgsql security definer set search_path='' as $$
declare v_anterior public.solicitudes%rowtype; v_horas integer; v_nuevos jsonb;
begin
  if not public.es_gestor() then raise exception 'Solo Administradores y Encargados pueden editar los datos generales'; end if;
  select * into v_anterior from public.solicitudes where id=p_solicitud_id for update;
  if not found then raise exception 'Solicitud no encontrada'; end if;
  if v_anterior.estado in ('cerrada','cancelada','rechazada') then raise exception 'No se pueden editar datos generales de una solicitud finalizada'; end if;
  if length(trim(p_nombre))=0 or length(trim(p_detalle))=0 then raise exception 'Nombre y detalle son obligatorios'; end if;
  if not exists(select 1 from public.clientes where id=p_cliente_id and activo) then raise exception 'Cliente inválido o inactivo'; end if;
  if not exists(select 1 from public.ubicaciones where id=p_ubicacion_id and cliente_id=p_cliente_id and activa) then raise exception 'La ubicación no pertenece al cliente'; end if;
  if not exists(select 1 from public.tipos_solicitud where id=p_tipo_solicitud_id and activo) then raise exception 'Tipo de solicitud inválido'; end if;
  if p_prioridad is not null then
    select horas into v_horas from public.tipo_solicitud_sla where tipo_solicitud_id=p_tipo_solicitud_id and prioridad=p_prioridad;
    if v_horas is null then raise exception 'No existe SLA para el tipo y prioridad seleccionados'; end if;
    if p_prioridad='urgente' then v_horas:=least(v_horas,24); end if;
  end if;
  update public.solicitudes set nombre=trim(p_nombre),detalle=trim(p_detalle),cliente_id=p_cliente_id,
    ubicacion_id=p_ubicacion_id,tipo_solicitud_id=p_tipo_solicitud_id,prioridad=p_prioridad,
    sla_horas=case when p_prioridad is null then null else v_horas end,
    sla_vence_en=case when p_prioridad is null then null else v_anterior.creado_en+(v_horas||' hours')::interval end
  where id=p_solicitud_id;
  v_nuevos:=jsonb_build_object('nombre',trim(p_nombre),'detalle',trim(p_detalle),'cliente_id',p_cliente_id,'ubicacion_id',p_ubicacion_id,'tipo_solicitud_id',p_tipo_solicitud_id,'prioridad',p_prioridad);
  insert into public.solicitud_ediciones_auditoria(solicitud_id,editado_por,datos_anteriores,datos_nuevos)
  values(p_solicitud_id,auth.uid(),jsonb_build_object('nombre',v_anterior.nombre,'detalle',v_anterior.detalle,'cliente_id',v_anterior.cliente_id,'ubicacion_id',v_anterior.ubicacion_id,'tipo_solicitud_id',v_anterior.tipo_solicitud_id,'prioridad',v_anterior.prioridad),v_nuevos);
end $$;
revoke all on function public.editar_datos_solicitud(uuid,text,text,uuid,uuid,uuid,public.prioridad_solicitud) from public;
grant execute on function public.editar_datos_solicitud(uuid,text,text,uuid,uuid,uuid,public.prioridad_solicitud) to authenticated;
