create type public.estado_postulacion_tecnico as enum ('pendiente','aprobada','rechazada');
create table public.postulaciones_tecnicos (
  id uuid primary key default gen_random_uuid(), nombre_completo text not null,
  identificacion text not null, especialidad public.especialidad_tecnico not null,
  celular text not null, correo text, provincia text not null, canton text not null,
  direccion text, experiencia text not null, disponibilidad text, estado public.estado_postulacion_tecnico not null default 'pendiente',
  comentario_revision text, revisado_por uuid references public.usuarios(id) on delete set null,
  revisado_en timestamptz, creado_en timestamptz not null default now()
);
create unique index postulacion_pendiente_identificacion on public.postulaciones_tecnicos(identificacion) where estado='pendiente';
alter table public.postulaciones_tecnicos enable row level security;
create policy postulaciones_admin_lectura on public.postulaciones_tecnicos for select to authenticated using(public.tiene_rol('administrador'));
grant select on public.postulaciones_tecnicos to authenticated;

create or replace function public.crear_postulacion_tecnico(p_nombre text,p_identificacion text,p_especialidad public.especialidad_tecnico,p_celular text,p_correo text,p_provincia text,p_canton text,p_direccion text,p_experiencia text,p_disponibilidad text)
returns uuid language plpgsql security definer set search_path='' as $$ declare v_id uuid; begin
  if length(trim(p_nombre))<3 or length(trim(p_identificacion))<5 or length(trim(p_celular))<8 or length(trim(p_experiencia))<10 then raise exception 'Complete los datos obligatorios de la postulación'; end if;
  if p_correo is not null and trim(p_correo)<>'' and p_correo !~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then raise exception 'Correo electrónico inválido'; end if;
  insert into public.postulaciones_tecnicos(nombre_completo,identificacion,especialidad,celular,correo,provincia,canton,direccion,experiencia,disponibilidad)
  values(trim(p_nombre),trim(p_identificacion),p_especialidad,trim(p_celular),nullif(trim(p_correo),''),trim(p_provincia),trim(p_canton),nullif(trim(p_direccion),''),trim(p_experiencia),nullif(trim(p_disponibilidad),'')) returning id into v_id; return v_id;
end $$;

create or replace function public.resolver_postulacion_tecnico(p_postulacion_id uuid,p_aprobar boolean,p_comentario text)
returns uuid language plpgsql security definer set search_path='' as $$ declare v public.postulaciones_tecnicos%rowtype; v_tecnico uuid; begin
  if not public.tiene_rol('administrador') then raise exception 'Solo el Administrador de Proceso puede revisar postulaciones'; end if;
  select * into v from public.postulaciones_tecnicos where id=p_postulacion_id and estado='pendiente' for update;if not found then raise exception 'Postulación no encontrada o ya revisada';end if;
  if p_aprobar then insert into public.tecnicos(nombre_completo,identificacion,especialidad,celular,correo,direccion,observaciones,activo) values(v.nombre_completo,v.identificacion,v.especialidad,v.celular,v.correo,concat_ws(', ',v.direccion,v.canton,v.provincia),concat('Experiencia: ',v.experiencia,'. Disponibilidad: ',coalesce(v.disponibilidad,'No indicada')),true) returning id into v_tecnico;end if;
  update public.postulaciones_tecnicos set estado=case when p_aprobar then 'aprobada'::public.estado_postulacion_tecnico else 'rechazada'::public.estado_postulacion_tecnico end,comentario_revision=nullif(trim(p_comentario),''),revisado_por=auth.uid(),revisado_en=now() where id=p_postulacion_id;return v_tecnico;
end $$;
revoke all on function public.crear_postulacion_tecnico(text,text,public.especialidad_tecnico,text,text,text,text,text,text,text) from public;
grant execute on function public.crear_postulacion_tecnico(text,text,public.especialidad_tecnico,text,text,text,text,text,text,text) to anon,authenticated;
revoke all on function public.resolver_postulacion_tecnico(uuid,boolean,text) from public;
grant execute on function public.resolver_postulacion_tecnico(uuid,boolean,text) to authenticated;
