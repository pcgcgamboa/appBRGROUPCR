alter table public.postulaciones_tecnicos
add column pretension_salarial numeric(14,2)
check (pretension_salarial is null or pretension_salarial > 0);

create table public.postulacion_tecnico_documentos (
  id uuid primary key default gen_random_uuid(),
  postulacion_id uuid not null references public.postulaciones_tecnicos(id) on delete cascade,
  tipo text not null check (tipo in ('hoja_vida', 'hoja_delincuencia', 'cedula')),
  nombre_archivo text not null,
  ruta_storage text not null unique,
  mime_type text not null,
  tamano_bytes bigint not null check (tamano_bytes > 0 and tamano_bytes <= 10485760),
  creado_en timestamptz not null default now(),
  unique (postulacion_id, tipo)
);

alter table public.postulacion_tecnico_documentos enable row level security;

create policy postulacion_documentos_gestores_lectura
on public.postulacion_tecnico_documentos for select to authenticated
using (public.es_gestor());

grant select on public.postulacion_tecnico_documentos to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'postulaciones-tecnicos',
  'postulaciones-tecnicos',
  false,
  10485760,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy storage_postulaciones_tecnicos_crear
on storage.objects for insert to anon, authenticated
with check (
  bucket_id = 'postulaciones-tecnicos'
  and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
);

create policy storage_postulaciones_tecnicos_gestores_lectura
on storage.objects for select to authenticated
using (bucket_id = 'postulaciones-tecnicos' and public.es_gestor());

drop function if exists public.crear_postulacion_tecnico(
  text, text, public.especialidad_tecnico, text, text, text, text, text, text, text
);

create function public.crear_postulacion_tecnico(
  p_postulacion_id uuid,
  p_nombre text,
  p_identificacion text,
  p_especialidad public.especialidad_tecnico,
  p_celular text,
  p_correo text,
  p_provincia text,
  p_canton text,
  p_direccion text,
  p_experiencia text,
  p_disponibilidad text,
  p_pretension_salarial numeric,
  p_documentos jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_documento jsonb;
  v_tipos text[];
begin
  if length(trim(p_nombre)) < 3
    or length(trim(p_identificacion)) < 5
    or length(trim(p_celular)) < 8
    or length(trim(p_experiencia)) < 10
  then
    raise exception 'Complete los datos obligatorios de la postulación';
  end if;

  if p_pretension_salarial is null or p_pretension_salarial <= 0 then
    raise exception 'Indique una pretensión salarial válida';
  end if;

  if p_correo is not null
    and trim(p_correo) <> ''
    and p_correo !~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
  then
    raise exception 'Correo electrónico inválido';
  end if;

  if jsonb_typeof(p_documentos) <> 'array' or jsonb_array_length(p_documentos) <> 3 then
    raise exception 'Debe adjuntar hoja de vida, hoja de delincuencia y cédula';
  end if;

  select array_agg(documento ->> 'tipo' order by documento ->> 'tipo')
  into v_tipos
  from jsonb_array_elements(p_documentos) documento;

  if v_tipos is distinct from array['cedula', 'hoja_delincuencia', 'hoja_vida']::text[] then
    raise exception 'Los tipos de documentos de la postulación no son válidos';
  end if;

  for v_documento in select value from jsonb_array_elements(p_documentos)
  loop
    if coalesce(v_documento ->> 'ruta_storage', '') not like p_postulacion_id::text || '/%'
      or coalesce((v_documento ->> 'tamano_bytes')::bigint, 0) <= 0
      or (v_documento ->> 'tamano_bytes')::bigint > 10485760
      or coalesce(v_documento ->> 'mime_type', '') not in (
        'application/pdf', 'image/jpeg', 'image/png', 'image/webp'
      )
    then
      raise exception 'Documento de postulación inválido';
    end if;
  end loop;

  insert into public.postulaciones_tecnicos (
    id, nombre_completo, identificacion, especialidad, celular, correo, provincia, canton,
    direccion, experiencia, disponibilidad, pretension_salarial
  ) values (
    p_postulacion_id, trim(p_nombre), trim(p_identificacion), p_especialidad, trim(p_celular),
    nullif(trim(p_correo), ''), trim(p_provincia), trim(p_canton), nullif(trim(p_direccion), ''),
    trim(p_experiencia), nullif(trim(p_disponibilidad), ''), p_pretension_salarial
  );

  insert into public.postulacion_tecnico_documentos (
    postulacion_id, tipo, nombre_archivo, ruta_storage, mime_type, tamano_bytes
  )
  select
    p_postulacion_id,
    documento ->> 'tipo',
    documento ->> 'nombre_archivo',
    documento ->> 'ruta_storage',
    documento ->> 'mime_type',
    (documento ->> 'tamano_bytes')::bigint
  from jsonb_array_elements(p_documentos) documento;

  return p_postulacion_id;
end
$$;

revoke all on function public.crear_postulacion_tecnico(
  uuid, text, text, public.especialidad_tecnico, text, text, text, text, text, text, text, numeric, jsonb
) from public;
grant execute on function public.crear_postulacion_tecnico(
  uuid, text, text, public.especialidad_tecnico, text, text, text, text, text, text, text, numeric, jsonb
) to anon, authenticated;

create or replace function public.resolver_postulacion_tecnico(
  p_postulacion_id uuid,
  p_aprobar boolean,
  p_comentario text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.postulaciones_tecnicos%rowtype;
  v_tecnico uuid;
begin
  if not public.tiene_rol('administrador') then
    raise exception 'Solo el Administrador de Proceso puede revisar postulaciones';
  end if;

  select * into v
  from public.postulaciones_tecnicos
  where id = p_postulacion_id and estado = 'pendiente'
  for update;

  if not found then
    raise exception 'Postulación no encontrada o ya revisada';
  end if;

  if p_aprobar then
    insert into public.tecnicos (
      nombre_completo, identificacion, especialidad, celular, correo, direccion, observaciones, activo
    ) values (
      v.nombre_completo,
      v.identificacion,
      v.especialidad,
      v.celular,
      v.correo,
      concat_ws(', ', v.direccion, v.canton, v.provincia),
      concat(
        'Experiencia: ', v.experiencia,
        '. Disponibilidad: ', coalesce(v.disponibilidad, 'No indicada'),
        '. Pretensión salarial: ₡', coalesce(v.pretension_salarial::text, 'No indicada')
      ),
      true
    ) returning id into v_tecnico;
  end if;

  update public.postulaciones_tecnicos
  set estado = case
      when p_aprobar then 'aprobada'::public.estado_postulacion_tecnico
      else 'rechazada'::public.estado_postulacion_tecnico
    end,
    comentario_revision = nullif(trim(p_comentario), ''),
    revisado_por = auth.uid(),
    revisado_en = now()
  where id = p_postulacion_id;

  return v_tecnico;
end
$$;
