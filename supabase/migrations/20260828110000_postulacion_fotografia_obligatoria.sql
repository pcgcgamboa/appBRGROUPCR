create or replace function public.crear_postulacion_tecnico(
  p_postulacion_id uuid, p_nombre text, p_identificacion text,
  p_especialidad public.especialidad_tecnico, p_celular text, p_correo text,
  p_provincia text, p_canton text, p_direccion text, p_experiencia text,
  p_disponibilidad text, p_pretension_salarial numeric, p_documentos jsonb
) returns uuid language plpgsql security definer set search_path='' as $$
declare v_documento jsonb; v_tipos text[];
begin
  if length(trim(p_nombre))<3 or length(trim(p_identificacion))<5
    or length(trim(p_celular))<8 or length(trim(p_experiencia))<10 then
    raise exception 'Complete los datos obligatorios de la postulación';
  end if;
  if p_pretension_salarial is null or p_pretension_salarial<=0 then
    raise exception 'Indique una pretensión salarial válida';
  end if;
  if p_correo is not null and trim(p_correo)<>''
    and p_correo !~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'Correo electrónico inválido';
  end if;
  if jsonb_typeof(p_documentos)<>'array' or jsonb_array_length(p_documentos)<>4 then
    raise exception 'Debe adjuntar fotografía, hoja de vida, hoja de delincuencia y cédula';
  end if;
  select array_agg(documento->>'tipo' order by documento->>'tipo') into v_tipos
  from jsonb_array_elements(p_documentos) documento;
  if v_tipos is distinct from array['cedula','fotografia','hoja_delincuencia','hoja_vida']::text[] then
    raise exception 'Los tipos de documentos de la postulación no son válidos';
  end if;
  for v_documento in select value from jsonb_array_elements(p_documentos) loop
    if coalesce(v_documento->>'ruta_storage','') not like p_postulacion_id::text||'/%'
      or coalesce((v_documento->>'tamano_bytes')::bigint,0)<=0
      or (v_documento->>'tamano_bytes')::bigint>10485760
      or coalesce(v_documento->>'mime_type','') not in ('application/pdf','image/jpeg','image/png','image/webp')
      or (v_documento->>'tipo'='fotografia' and v_documento->>'mime_type' not in ('image/jpeg','image/png','image/webp')) then
      raise exception 'Documento de postulación inválido';
    end if;
  end loop;
  insert into public.postulaciones_tecnicos(
    id,nombre_completo,identificacion,especialidad,celular,correo,provincia,canton,
    direccion,experiencia,disponibilidad,pretension_salarial
  ) values(
    p_postulacion_id,trim(p_nombre),trim(p_identificacion),p_especialidad,trim(p_celular),
    nullif(trim(p_correo),''),trim(p_provincia),trim(p_canton),nullif(trim(p_direccion),''),
    trim(p_experiencia),nullif(trim(p_disponibilidad),''),p_pretension_salarial
  );
  insert into public.postulacion_tecnico_documentos(
    postulacion_id,tipo,nombre_archivo,ruta_storage,mime_type,tamano_bytes
  ) select p_postulacion_id,documento->>'tipo',documento->>'nombre_archivo',
    documento->>'ruta_storage',documento->>'mime_type',(documento->>'tamano_bytes')::bigint
  from jsonb_array_elements(p_documentos) documento;
  return p_postulacion_id;
end $$;
