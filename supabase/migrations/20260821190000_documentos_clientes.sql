create table public.cliente_documentos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  tipo text not null default 'otro' check(tipo in ('contrato','identificacion','factura','proforma','otro')),
  nombre text not null check(length(trim(nombre))>0),
  descripcion text,
  fecha_documento date,
  nombre_archivo text not null,
  ruta_storage text not null unique,
  mime_type text not null check(mime_type in ('application/pdf','image/jpeg','image/png','image/webp')),
  tamano_bytes bigint not null check(tamano_bytes>0 and tamano_bytes<=10485760),
  subido_por uuid not null references public.usuarios(id) on delete restrict,
  creado_en timestamptz not null default now()
);
create index cliente_documentos_cliente_idx on public.cliente_documentos(cliente_id,creado_en desc);
alter table public.cliente_documentos enable row level security;
create policy cliente_documentos_lectura on public.cliente_documentos for select to authenticated
using(public.es_gestor() or cliente_id=public.cliente_del_usuario());
create policy cliente_documentos_crear on public.cliente_documentos for insert to authenticated
with check(public.es_gestor() and subido_por=auth.uid());
create policy cliente_documentos_actualizar on public.cliente_documentos for update to authenticated
using(public.es_gestor()) with check(public.es_gestor());
create policy cliente_documentos_eliminar on public.cliente_documentos for delete to authenticated
using(public.es_gestor());
grant select,insert,update,delete on public.cliente_documentos to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('clientes-documentos','clientes-documentos',false,10485760,
  array['application/pdf','image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types;
create policy storage_clientes_documentos_lectura on storage.objects for select to authenticated
using(bucket_id='clientes-documentos' and (
  public.es_gestor() or ((storage.foldername(name))[1])::uuid=public.cliente_del_usuario()
));
create policy storage_clientes_documentos_crear on storage.objects for insert to authenticated
with check(bucket_id='clientes-documentos' and owner_id=auth.uid()::text and public.es_gestor());
create policy storage_clientes_documentos_eliminar on storage.objects for delete to authenticated
using(bucket_id='clientes-documentos' and public.es_gestor());

comment on table public.cliente_documentos is
'Expediente documental privado del cliente: contratos, identificaciones, facturas y otros archivos.';
