-- Analisis de costos de materiales por solicitud, ruta y responsable de ruta.

create or replace function public.obtener_reporte_costos_materiales()
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_resultado jsonb;
begin
  if not public.es_gestor() then
    raise exception 'Solo Administradores y Encargados pueden consultar reportes de costos';
  end if;

  select jsonb_build_object(
    'total', coalesce((
      select sum(sm.cantidad * coalesce(sm.costo_referencial_aplicado, 0))
      from public.solicitud_materiales sm
    ), 0),
    'por_solicitud', coalesce((
      select jsonb_agg(to_jsonb(x) order by x.costo_total desc, x.numero desc)
      from (
        select
          s.id,
          s.numero,
          s.nombre,
          c.nombre as cliente,
          count(sm.id)::integer as registros_materiales,
          coalesce(sum(sm.cantidad * coalesce(sm.costo_referencial_aplicado, 0)), 0) as costo_total
        from public.solicitudes s
        join public.solicitud_materiales sm on sm.solicitud_id = s.id
        join public.clientes c on c.id = s.cliente_id
        group by s.id, s.numero, s.nombre, c.nombre
      ) x
    ), '[]'::jsonb),
    'por_ruta', coalesce((
      select jsonb_agg(to_jsonb(x) order by x.costo_total desc, x.codigo)
      from (
        select
          rp.id,
          rp.codigo,
          rp.nombre,
          rp.fecha_programada as fecha,
          u.nombre_completo as encargado,
          count(distinct rs.solicitud_id)::integer as solicitudes,
          coalesce(sum(sm.cantidad * coalesce(sm.costo_referencial_aplicado, 0)), 0) as costo_total
        from public.rutas_proceso rp
        join public.usuarios u on u.id = rp.responsable_id
        join public.ruta_solicitudes rs on rs.ruta_id = rp.id
        join public.solicitud_materiales sm on sm.solicitud_id = rs.solicitud_id
        group by rp.id, rp.codigo, rp.nombre, rp.fecha_programada, u.nombre_completo
      ) x
    ), '[]'::jsonb),
    'por_encargado', coalesce((
      select jsonb_agg(to_jsonb(x) order by x.costo_total desc, x.encargado)
      from (
        select
          u.id,
          u.nombre_completo as encargado,
          count(distinct rp.id)::integer as rutas,
          count(distinct rs.solicitud_id)::integer as solicitudes,
          coalesce(sum(sm.cantidad * coalesce(sm.costo_referencial_aplicado, 0)), 0) as costo_total
        from public.rutas_proceso rp
        join public.usuarios u on u.id = rp.responsable_id
        join public.ruta_solicitudes rs on rs.ruta_id = rp.id
        join public.solicitud_materiales sm on sm.solicitud_id = rs.solicitud_id
        group by u.id, u.nombre_completo
      ) x
    ), '[]'::jsonb)
  ) into v_resultado;

  return v_resultado;
end;
$$;

revoke all on function public.obtener_reporte_costos_materiales() from public;
grant execute on function public.obtener_reporte_costos_materiales() to authenticated;

comment on function public.obtener_reporte_costos_materiales() is
  'Resume el costo historico de materiales por solicitud, ruta de proceso y responsable.';
