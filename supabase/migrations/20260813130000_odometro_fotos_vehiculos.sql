-- Odometro e inventario fotografico de vehiculos.
alter table public.vehiculos
  add column kilometraje_actual numeric(14,2) not null default 0 check (kilometraje_actual >= 0);

alter table public.ruta_movimientos_vehiculo
  add column kilometraje_actual numeric(14,2) check (kilometraje_actual >= 0);

create table public.vehiculo_kilometraje_historial (
  id uuid primary key default gen_random_uuid(),
  vehiculo_id uuid not null references public.vehiculos(id) on delete cascade,
  ruta_id uuid references public.rutas_proceso(id) on delete set null,
  kilometraje numeric(14,2) not null check (kilometraje >= 0),
  registrado_por uuid references public.usuarios(id) on delete set null,
  creado_en timestamptz not null default now()
);

create table public.vehiculo_fotos (
  id uuid primary key default gen_random_uuid(),
  vehiculo_id uuid not null references public.vehiculos(id) on delete cascade,
  nombre_archivo text not null,
  ruta_storage text not null unique,
  mime_type text not null check (mime_type in ('image/jpeg','image/png','image/webp')),
  tamano_bytes bigint not null check (tamano_bytes > 0 and tamano_bytes <= 10485760),
  descripcion text,
  subido_por uuid not null references public.usuarios(id) on delete restrict,
  creado_en timestamptz not null default now()
);

create index vehiculo_kilometraje_idx on public.vehiculo_kilometraje_historial(vehiculo_id, creado_en desc);
create index vehiculo_fotos_idx on public.vehiculo_fotos(vehiculo_id, creado_en desc);

create or replace function public.validar_odometro_vehiculo()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.kilometraje_actual < old.kilometraje_actual then
    raise exception 'El kilometraje actual no puede ser menor al registrado (%)', old.kilometraje_actual;
  end if;
  return new;
end $$;

create trigger validar_odometro_vehiculo before update of kilometraje_actual on public.vehiculos
for each row execute function public.validar_odometro_vehiculo();

create or replace function public.sincronizar_odometro_movimiento()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_actual numeric;
begin
  if new.kilometraje_actual is null then return new; end if;
  select kilometraje_actual into v_actual from public.vehiculos where id=new.vehiculo_id for update;
  if new.kilometraje_actual < v_actual then
    raise exception 'El kilometraje indicado no puede ser menor al odometro actual (%)', v_actual;
  end if;
  update public.vehiculos set kilometraje_actual=new.kilometraje_actual where id=new.vehiculo_id;
  insert into public.vehiculo_kilometraje_historial(vehiculo_id,ruta_id,kilometraje,registrado_por)
  values(new.vehiculo_id,new.ruta_id,new.kilometraje_actual,new.registrado_por);
  return new;
end $$;

create trigger sincronizar_odometro_movimiento after insert or update of kilometraje_actual
on public.ruta_movimientos_vehiculo for each row execute function public.sincronizar_odometro_movimiento();

alter table public.vehiculo_kilometraje_historial enable row level security;
alter table public.vehiculo_fotos enable row level security;
create policy kilometraje_lectura on public.vehiculo_kilometraje_historial for select to authenticated using (true);
create policy fotos_lectura on public.vehiculo_fotos for select to authenticated using (true);
create policy fotos_gestion on public.vehiculo_fotos for all to authenticated
using (public.tiene_rol('administrador')) with check (public.tiene_rol('administrador') and subido_por=auth.uid());

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('vehiculos-fotos','vehiculos-fotos',false,10485760,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create policy storage_vehiculos_fotos_lectura on storage.objects for select to authenticated
using(bucket_id='vehiculos-fotos');
create policy storage_vehiculos_fotos_crear on storage.objects for insert to authenticated
with check(bucket_id='vehiculos-fotos' and owner_id=auth.uid()::text and public.tiene_rol('administrador'));
create policy storage_vehiculos_fotos_eliminar on storage.objects for delete to authenticated
using(bucket_id='vehiculos-fotos' and (owner_id=auth.uid()::text or public.tiene_rol('administrador')));

grant select,insert,update,delete on public.vehiculo_kilometraje_historial to authenticated;
grant select,insert,update,delete on public.vehiculo_fotos to authenticated;

update public.vehiculos set kilometraje_actual=case placa
  when 'DEM-101' then 48250 when 'DEM-202' then 71680 when 'DEM-303' then 12900 else kilometraje_actual end;
