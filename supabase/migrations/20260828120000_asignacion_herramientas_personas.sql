create table public.herramienta_asignaciones (
  id uuid primary key default gen_random_uuid(),
  herramienta_id uuid not null references public.materiales(id) on delete restrict,
  usuario_id uuid not null references public.usuarios(id) on delete restrict,
  asignada_en timestamptz not null default now(),
  devuelta_en timestamptz,
  observaciones_entrega text,
  observaciones_devolucion text,
  asignada_por uuid not null references public.usuarios(id) on delete restrict,
  devuelta_por uuid references public.usuarios(id) on delete restrict,
  check(devuelta_en is null or devuelta_en >= asignada_en),
  check((devuelta_en is null and devuelta_por is null) or (devuelta_en is not null and devuelta_por is not null))
);

create unique index herramienta_asignacion_activa_unica
on public.herramienta_asignaciones(herramienta_id)
where devuelta_en is null;
create index herramienta_asignaciones_usuario_idx
on public.herramienta_asignaciones(usuario_id,asignada_en desc);

alter table public.herramienta_asignaciones enable row level security;
create policy herramienta_asignaciones_lectura
on public.herramienta_asignaciones for select to authenticated
using(public.es_gestor() or usuario_id=auth.uid());
grant select on public.herramienta_asignaciones to authenticated;

create table public.inventario_actividades (
  id bigint generated always as identity primary key,
  herramienta_id uuid not null references public.materiales(id) on delete cascade,
  tipo text not null check(tipo in ('asignacion','devolucion')),
  usuario_id uuid not null references public.usuarios(id) on delete restrict,
  actor_id uuid references public.usuarios(id) on delete set null,
  descripcion text,
  creado_en timestamptz not null default now()
);
create index inventario_actividades_herramienta_idx
on public.inventario_actividades(herramienta_id,creado_en desc);
alter table public.inventario_actividades enable row level security;
create policy inventario_actividades_lectura on public.inventario_actividades
for select to authenticated using(public.es_gestor() or usuario_id=auth.uid());
grant select on public.inventario_actividades to authenticated;

create or replace function public.asignar_herramienta(
  p_herramienta_id uuid,p_usuario_id uuid,p_observaciones text default null
) returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid; v_nombre text;
begin
  if not public.es_gestor() then raise exception 'Solo administradores o encargados pueden asignar herramientas'; end if;
  select nombre into v_nombre from public.materiales
  where id=p_herramienta_id and categoria='herramienta' and activo for update;
  if not found then raise exception 'La herramienta no existe o no está activa'; end if;
  if not exists(select 1 from public.usuarios where id=p_usuario_id and activo) then
    raise exception 'La persona seleccionada no está activa';
  end if;
  if exists(select 1 from public.herramienta_asignaciones where herramienta_id=p_herramienta_id and devuelta_en is null) then
    raise exception 'La herramienta ya se encuentra asignada';
  end if;
  insert into public.herramienta_asignaciones(
    herramienta_id,usuario_id,observaciones_entrega,asignada_por
  ) values(p_herramienta_id,p_usuario_id,nullif(trim(p_observaciones),''),auth.uid()) returning id into v_id;
  insert into public.inventario_actividades(herramienta_id,tipo,usuario_id,actor_id,descripcion)
  values(p_herramienta_id,'asignacion',p_usuario_id,auth.uid(),
    v_nombre||coalesce(' — '||nullif(trim(p_observaciones),''),''));
  return v_id;
end $$;

create or replace function public.devolver_herramienta(
  p_asignacion_id uuid,p_observaciones text default null
) returns void language plpgsql security definer set search_path='' as $$
declare v_asignacion public.herramienta_asignaciones%rowtype; v_nombre text;
begin
  if not public.es_gestor() then raise exception 'Solo administradores o encargados pueden recibir herramientas'; end if;
  select * into v_asignacion from public.herramienta_asignaciones
  where id=p_asignacion_id and devuelta_en is null for update;
  if not found then raise exception 'La asignación no existe o ya fue devuelta'; end if;
  update public.herramienta_asignaciones set devuelta_en=now(),devuelta_por=auth.uid(),
    observaciones_devolucion=nullif(trim(p_observaciones),'') where id=p_asignacion_id;
  select nombre into v_nombre from public.materiales where id=v_asignacion.herramienta_id;
  insert into public.inventario_actividades(herramienta_id,tipo,usuario_id,actor_id,descripcion)
  values(v_asignacion.herramienta_id,'devolucion',v_asignacion.usuario_id,auth.uid(),
    v_nombre||coalesce(' — '||nullif(trim(p_observaciones),''),''));
end $$;

revoke all on function public.asignar_herramienta(uuid,uuid,text) from public;
grant execute on function public.asignar_herramienta(uuid,uuid,text) to authenticated;
revoke all on function public.devolver_herramienta(uuid,text) from public;
grant execute on function public.devolver_herramienta(uuid,text) to authenticated;
