-- Una sola proforma en borrador por solicitud: "Generar proforma" queda bloqueado hasta enviar la
-- que está en borrador. Se valida dentro de la función (y no con un índice único parcial) porque ya
-- existen solicitudes con varios borradores históricos; un índice fallaría al crearse y anularlos
-- aquí cambiaría datos reales sin revisión. El `for update` sobre la solicitud serializa dos
-- llamadas simultáneas (doble clic, dos gestores) para que no generen dos borradores.
-- Cuerpo idéntico al de 20260828130000_proformas_costos_solicitud.sql salvo la validación nueva.
create or replace function public.generar_proforma_solicitud(p_solicitud_id uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid;v_numero bigint;v_orden integer:=0;v_borrador bigint;
begin
  if not public.es_gestor() then raise exception 'Solo administradores o encargados pueden generar proformas';end if;
  perform 1 from public.solicitudes where id=p_solicitud_id for update;
  if not found then raise exception 'Solicitud no encontrada';end if;
  select numero into v_borrador from public.proformas
  where solicitud_id=p_solicitud_id and estado='borrador' order by numero limit 1;
  if v_borrador is not null then
    raise exception 'Ya hay una proforma en borrador (#%): envíela antes de generar otra', v_borrador;
  end if;
  insert into public.proformas(solicitud_id,creado_por,actualizado_por)
  values(p_solicitud_id,auth.uid(),auth.uid()) returning id,numero into v_id,v_numero;
  insert into public.proforma_items(proforma_id,tipo,origen_id,descripcion,cantidad,unidad,precio_unitario,orden)
  select v_id,'inventario',sm.id,
    case m.naturaleza_provision when 'servicio' then 'Servicio: ' else '' end||m.nombre,
    sm.cantidad,m.unidad_medida,coalesce(sm.costo_referencial_aplicado,m.costo_referencial,0),
    row_number() over(order by sm.creado_en,sm.id)
  from public.solicitud_materiales sm join public.materiales m on m.id=sm.material_id
  where sm.solicitud_id=p_solicitud_id;
  select coalesce(max(orden),0) into v_orden from public.proforma_items where proforma_id=v_id;
  insert into public.proforma_items(proforma_id,tipo,origen_id,descripcion,cantidad,unidad,precio_unitario,orden)
  select v_id,'mano_obra',a.operador_id,'Mano de obra: '||u.nombre_completo,
    sum(a.horas_trabajadas),'hora',u.costo_hora,v_orden+row_number() over(order by u.nombre_completo)
  from public.avances a join public.usuarios u on u.id=a.operador_id
  where a.solicitud_id=p_solicitud_id group by a.operador_id,u.nombre_completo,u.costo_hora;
  perform public.recalcular_proforma(v_id);
  perform public.registrar_actividad_solicitud(p_solicitud_id,'proforma','Proforma generada',
    'Proforma #'||v_numero||' generada con inventario y horas registradas.',auth.uid(),'proformas',v_id::text,
    jsonb_build_object('proforma_id',v_id,'origen','calculo_automatico'),now());
  return v_id;
end $$;
revoke all on function public.generar_proforma_solicitud(uuid) from public;
grant execute on function public.generar_proforma_solicitud(uuid) to authenticated;
