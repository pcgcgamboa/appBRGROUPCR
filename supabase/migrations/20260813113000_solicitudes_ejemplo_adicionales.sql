-- Solicitudes adicionales de demostracion. Conserva todos los datos existentes.
do $$
declare
  v_solicitante uuid;
  v_operador uuid;
  v_tipo_mantenimiento uuid;
  v_tipo_soporte uuid;
  v_tipo_reparacion uuid;
  v_tipo_instalacion uuid;
begin
  select ur.usuario_id into v_solicitante
  from public.usuario_roles ur join public.roles r on r.id = ur.rol_id
  where r.codigo in ('administrador', 'encargado') order by r.codigo limit 1;

  select ur.usuario_id into v_operador
  from public.usuario_roles ur join public.roles r on r.id = ur.rol_id
  join public.usuarios u on u.id = ur.usuario_id
  where r.codigo = 'operador' and u.activo limit 1;

  select id into v_tipo_mantenimiento from public.tipos_solicitud where nombre = 'Mantenimiento' limit 1;
  select id into v_tipo_soporte from public.tipos_solicitud where nombre = 'Soporte' limit 1;
  select id into v_tipo_reparacion from public.tipos_solicitud where nombre = 'Reparación' limit 1;
  select id into v_tipo_instalacion from public.tipos_solicitud where nombre = 'Instalación' limit 1;

  if v_solicitante is null then
    raise notice 'No se crearon solicitudes de ejemplo: no existe un administrador o encargado.';
    return;
  end if;

  insert into public.solicitudes(id,nombre,tipo_solicitud_id,detalle,cliente_id,ubicacion_id,solicitante_id)
  values
    ('f7000000-0000-4000-8000-000000000001','Revisión de luminarias',v_tipo_mantenimiento,'Revisar luminarias exteriores y sustituir unidades dañadas.','f6000000-0000-4000-8000-000000000001','f6100000-0000-4000-8000-000000000001',v_solicitante),
    ('f7000000-0000-4000-8000-000000000002','Instalación de punto de red',v_tipo_instalacion,'Instalar un nuevo punto de red en el área administrativa.','f6000000-0000-4000-8000-000000000001','f6100000-0000-4000-8000-000000000001',v_solicitante),
    ('f7000000-0000-4000-8000-000000000003','Diagnóstico de aire acondicionado',v_tipo_reparacion,'El equipo principal no enfría y presenta ruido intermitente.','f6000000-0000-4000-8000-000000000001','f6100000-0000-4000-8000-000000000002',v_solicitante),
    ('f7000000-0000-4000-8000-000000000004','Soporte a impresora de bodega',v_tipo_soporte,'La impresora de etiquetas pierde conexión durante la operación.','f6000000-0000-4000-8000-000000000001','f6100000-0000-4000-8000-000000000002',v_solicitante),
    ('f7000000-0000-4000-8000-000000000005','Mantenimiento de portón eléctrico',v_tipo_mantenimiento,'Realizar ajuste, lubricación y revisión de sensores de seguridad.','f6000000-0000-4000-8000-000000000001','f6100000-0000-4000-8000-000000000002',v_solicitante),
    ('f7000000-0000-4000-8000-000000000006','Reparación de fuga de agua',v_tipo_reparacion,'Atender fuga localizada junto al acceso de colaboradores.','f6000000-0000-4000-8000-000000000001','f6100000-0000-4000-8000-000000000001',v_solicitante)
  on conflict(id) do nothing;

  if v_operador is not null then
    insert into public.solicitudes(id,nombre,tipo_solicitud_id,detalle,cliente_id,ubicacion_id,solicitante_id,operador_id,prioridad,estado,sla_horas,sla_vence_en)
    values
      ('f7000000-0000-4000-8000-000000000007','Cambio urgente de cerradura',v_tipo_reparacion,'La puerta de acceso principal no asegura correctamente.','f6000000-0000-4000-8000-000000000001','f6100000-0000-4000-8000-000000000001',v_solicitante,v_operador,'urgente','asignada',24,now()+interval '24 hours'),
      ('f7000000-0000-4000-8000-000000000008','Mantenimiento preventivo de planta',v_tipo_mantenimiento,'Inspección general y prueba de transferencia de la planta eléctrica.','f6000000-0000-4000-8000-000000000001','f6100000-0000-4000-8000-000000000002',v_solicitante,v_operador,'alta','asignada',48,now()+interval '48 hours'),
      ('f7000000-0000-4000-8000-000000000009','Instalación de cámara exterior',v_tipo_instalacion,'Instalar cámara y validar cobertura en el estacionamiento.','f6000000-0000-4000-8000-000000000001','f6100000-0000-4000-8000-000000000001',v_solicitante,v_operador,'media','asignada',72,now()+interval '72 hours'),
      ('f7000000-0000-4000-8000-000000000010','Soporte de terminal móvil',v_tipo_soporte,'Configurar la terminal utilizada para control de inventario.','f6000000-0000-4000-8000-000000000001','f6100000-0000-4000-8000-000000000002',v_solicitante,v_operador,'baja','asignada',120,now()+interval '120 hours')
    on conflict(id) do nothing;
  end if;
end $$;
