create or replace function public.actualizar_perfil_propio(
  p_nombre_completo text,
  p_telefono text
) returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if length(trim(coalesce(p_nombre_completo, ''))) < 3 then
    raise exception 'El nombre debe tener al menos 3 caracteres';
  end if;

  update public.usuarios
  set nombre_completo = trim(p_nombre_completo),
      telefono = nullif(trim(coalesce(p_telefono, '')), '')
  where id = auth.uid();

  if not found then
    raise exception 'No se encontró el perfil autenticado';
  end if;
end
$$;

revoke all on function public.actualizar_perfil_propio(text, text) from public;
grant execute on function public.actualizar_perfil_propio(text, text) to authenticated;

create or replace function public.obtener_contexto_solicitud_tecnico(
  p_solicitud_id uuid
) returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_usuario_id uuid := auth.uid();
  v_ruta_id uuid;
  v_resultado jsonb;
begin
  if v_usuario_id is null or not exists (
    select 1
    from public.solicitudes s
    where s.id = p_solicitud_id
      and (
        s.operador_id = v_usuario_id
        or exists (
          select 1
          from public.ruta_solicitudes rs
          join public.ruta_participantes participante on participante.ruta_id = rs.ruta_id
          where rs.solicitud_id = s.id and participante.usuario_id = v_usuario_id
        )
      )
  ) then
    raise exception 'No tiene permiso para consultar el contexto de esta solicitud';
  end if;

  select rs.ruta_id into v_ruta_id
  from public.ruta_solicitudes rs
  where rs.solicitud_id = p_solicitud_id;

  select jsonb_build_object(
    'cliente', c.nombre,
    'ubicacion', jsonb_build_object(
      'nombre', u.nombre,
      'provincia', u.provincia,
      'canton', u.canton,
      'distrito', u.distrito,
      'otras_senas', u.otras_senas
    ),
    'ruta', case when rp.id is null then null else jsonb_build_object(
      'codigo', rp.codigo,
      'nombre', rp.nombre,
      'fecha_programada', rp.fecha_programada,
      'estado', rp.estado,
      'encargado', responsable.nombre_completo
    ) end,
    'eventos', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', actividad.id,
        'tipo', actividad.tipo,
        'titulo', actividad.titulo,
        'descripcion', actividad.descripcion,
        'creado_en', actividad.creado_en
      ) order by actividad.creado_en desc, actividad.id desc)
      from public.ruta_actividades actividad
      where actividad.ruta_id = v_ruta_id
        and (
          actividad.tipo in ('ruta', 'vehiculo', 'movimiento', 'solicitud')
          or actividad.actor_id = v_usuario_id
          or actividad.datos ->> 'usuario_id' = v_usuario_id::text
        )
    ), '[]'::jsonb)
  ) into v_resultado
  from public.solicitudes s
  join public.clientes c on c.id = s.cliente_id
  join public.ubicaciones u on u.id = s.ubicacion_id
  left join public.rutas_proceso rp on rp.id = v_ruta_id
  left join public.usuarios responsable on responsable.id = rp.responsable_id
  where s.id = p_solicitud_id;

  return v_resultado;
end
$$;

revoke all on function public.obtener_contexto_solicitud_tecnico(uuid) from public;
grant execute on function public.obtener_contexto_solicitud_tecnico(uuid) to authenticated;
