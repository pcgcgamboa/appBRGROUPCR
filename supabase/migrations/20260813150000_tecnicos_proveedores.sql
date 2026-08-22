create type public.especialidad_tecnico as enum ('albanil','soldador','chofer');

create table public.tecnicos (
  id uuid primary key default gen_random_uuid(),
  nombre_completo text not null check(length(trim(nombre_completo))>0),
  identificacion text unique,
  especialidad public.especialidad_tecnico not null,
  celular text not null check(length(trim(celular))>0),
  correo text check(correo is null or correo ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  direccion text,
  contacto_emergencia text,
  observaciones text,
  activo boolean not null default true,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create table public.solicitud_tecnicos (
  solicitud_id uuid not null references public.solicitudes(id) on delete cascade,
  tecnico_id uuid not null references public.tecnicos(id) on delete restrict,
  asignado_por uuid not null references public.usuarios(id) on delete restrict,
  asignado_en timestamptz not null default now(),
  primary key(solicitud_id,tecnico_id)
);

create table public.proveedores (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check(length(trim(nombre))>0),
  identificacion text unique,
  persona_contacto text not null,
  telefono text not null,
  celular text,
  correo text,
  articulos_provee text not null,
  provincia text not null,
  canton text not null,
  distrito text not null,
  direccion text,
  activo boolean not null default true,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create trigger tecnicos_actualizado before update on public.tecnicos for each row execute function public.actualizar_marca_tiempo();
create trigger proveedores_actualizado before update on public.proveedores for each row execute function public.actualizar_marca_tiempo();
alter table public.tecnicos enable row level security;
alter table public.solicitud_tecnicos enable row level security;
alter table public.proveedores enable row level security;
create policy tecnicos_lectura on public.tecnicos for select to authenticated using(public.es_gestor() or public.tiene_rol('operador'));
create policy tecnicos_gestion on public.tecnicos for all to authenticated using(public.tiene_rol('administrador')) with check(public.tiene_rol('administrador'));
create policy solicitud_tecnicos_lectura on public.solicitud_tecnicos for select to authenticated using(public.puede_ver_solicitud(solicitud_id));
create policy proveedores_lectura on public.proveedores for select to authenticated using(public.es_gestor() or public.tiene_rol('operador'));
create policy proveedores_gestion on public.proveedores for all to authenticated using(public.tiene_rol('administrador')) with check(public.tiene_rol('administrador'));

create or replace function public.asignar_tecnicos_solicitud(p_solicitud_id uuid,p_tecnicos uuid[])
returns void language plpgsql set search_path='' as $$
begin
  if not public.es_gestor() and not exists(select 1 from public.solicitudes s where s.id=p_solicitud_id and s.operador_id=auth.uid() and public.tiene_rol('operador')) then
    raise exception 'No tiene permiso para asignar técnicos a esta solicitud';
  end if;
  if exists(select 1 from unnest(coalesce(p_tecnicos,'{}'::uuid[])) t left join public.tecnicos x on x.id=t where x.id is null or not x.activo) then
    raise exception 'Todos los técnicos deben existir y estar activos';
  end if;
  delete from public.solicitud_tecnicos where solicitud_id=p_solicitud_id;
  insert into public.solicitud_tecnicos(solicitud_id,tecnico_id,asignado_por)
  select p_solicitud_id,t,auth.uid() from unnest(coalesce(p_tecnicos,'{}'::uuid[])) t;
end $$;
revoke all on function public.asignar_tecnicos_solicitud(uuid,uuid[]) from public;
grant execute on function public.asignar_tecnicos_solicitud(uuid,uuid[]) to authenticated;
grant select,insert,update,delete on public.tecnicos,public.solicitud_tecnicos,public.proveedores to authenticated;

insert into public.tecnicos(id,nombre_completo,identificacion,especialidad,celular,correo,direccion,activo) values
('a8100000-0000-4000-8000-000000000001','Carlos Méndez Rojas','1-1111-1111','albanil','8888-1101','carlos.mendez@example.com','San José',true),
('a8100000-0000-4000-8000-000000000002','María Solano Vega','2-2222-2222','soldador','8888-2202',null,'Alajuela',true),
('a8100000-0000-4000-8000-000000000003','José Ramírez Mora','3-3333-3333','chofer','8888-3303','jose.ramirez@example.com','Heredia',true)
on conflict(id) do nothing;

insert into public.proveedores(id,nombre,identificacion,persona_contacto,telefono,celular,correo,articulos_provee,provincia,canton,distrito,direccion,activo) values
('b8200000-0000-4000-8000-000000000001','Materiales del Valle S.A.','3-101-999999','Laura Jiménez','2222-1000','8888-1000','ventas@materialesvalle.example','Cemento, bloques, arena, herramientas','San José','Desamparados','San Miguel','Frente a la plaza de deportes',true),
('b8200000-0000-4000-8000-000000000002','Soldaduras Técnicas CR','3-102-888888','Andrés Castro','2440-2000','8877-2000','contacto@soldadurascr.example','Electrodos, gases, acero, equipo de protección','Alajuela','Alajuela','San José','Zona industrial El Coyol',true)
on conflict(id) do nothing;
