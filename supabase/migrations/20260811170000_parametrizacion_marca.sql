create table public.configuracion_marca (
  id boolean primary key default true check (id),
  logo_url text not null default '/br-mantenimiento-logo.png',
  icono_url text not null default '/br-icon.png',
  actualizado_por uuid references public.usuarios(id) on delete set null,
  actualizado_en timestamptz not null default now()
);

insert into public.configuracion_marca (id) values (true)
on conflict (id) do nothing;

alter table public.configuracion_marca enable row level security;

create policy configuracion_marca_lectura
on public.configuracion_marca for select
to anon, authenticated
using (true);

create policy configuracion_marca_gestion
on public.configuracion_marca for update
to authenticated
using (public.tiene_rol('administrador'))
with check (public.tiene_rol('administrador'));

grant select on public.configuracion_marca to anon, authenticated;
grant update (logo_url, icono_url, actualizado_por, actualizado_en)
on public.configuracion_marca to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'marca', 'marca', true, 5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy storage_marca_gestion
on storage.objects for all
to authenticated
using (bucket_id = 'marca' and public.tiene_rol('administrador'))
with check (bucket_id = 'marca' and public.tiene_rol('administrador'));

