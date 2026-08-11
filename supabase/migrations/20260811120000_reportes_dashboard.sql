create or replace function public.obtener_dashboard_solicitudes()
returns jsonb
language plpgsql
stable
security invoker
set search_path = '' as $$
declare
  v_resultado jsonb;
begin
  if not public.es_gestor() then
    raise exception 'Solo Administradores y Encargados pueden consultar reportes';
  end if;

  select jsonb_build_object(
    'totales', jsonb_build_object(
      'total', count(*),
      'activas', count(*) filter (where estado not in ('cerrada', 'cancelada', 'rechazada')),
      'urgentes', count(*) filter (where prioridad = 'urgente'),
      'sla_vencidas', count(*) filter (
        where sla_vence_en < now()
          and estado not in ('atendida', 'cerrada', 'cancelada', 'rechazada')
      )
    ),
    'por_estado', (
      select coalesce(jsonb_agg(jsonb_build_object('nombre', estado, 'cantidad', cantidad) order by estado), '[]'::jsonb)
      from (
        select estado::text, count(*) as cantidad
        from public.solicitudes group by estado
      ) datos_estado
    ),
    'por_prioridad', (
      select coalesce(jsonb_agg(jsonb_build_object('nombre', prioridad, 'cantidad', cantidad) order by orden), '[]'::jsonb)
      from (
        select coalesce(prioridad::text, 'sin_definir') as prioridad,
          count(*) as cantidad,
          min(case prioridad when 'urgente' then 1 when 'alta' then 2 when 'media' then 3 when 'baja' then 4 else 5 end) as orden
        from public.solicitudes group by prioridad
      ) datos_prioridad
    ),
    'por_urgencia', (
      select coalesce(jsonb_agg(jsonb_build_object('nombre', categoria, 'cantidad', cantidad) order by orden), '[]'::jsonb)
      from (
        select case
          when prioridad <> 'urgente' or prioridad is null then 'no_urgentes'
          when estado in ('atendida', 'cerrada', 'cancelada', 'rechazada') then 'urgentes_finalizadas'
          when sla_vence_en < now() then 'urgentes_vencidas'
          else 'urgentes_en_plazo'
        end as categoria,
        count(*) as cantidad,
        min(case
          when prioridad <> 'urgente' or prioridad is null then 4
          when estado in ('atendida', 'cerrada', 'cancelada', 'rechazada') then 3
          when sla_vence_en < now() then 1
          else 2
        end) as orden
        from public.solicitudes
        group by categoria
      ) datos_urgencia
    )
  ) into v_resultado
  from public.solicitudes;

  return v_resultado;
end;
$$;

revoke all on function public.obtener_dashboard_solicitudes() from public;
grant execute on function public.obtener_dashboard_solicitudes() to authenticated;
