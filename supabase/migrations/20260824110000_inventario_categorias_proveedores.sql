alter table public.materiales
add column categoria text not null default 'material'
check (categoria in ('material', 'herramienta', 'producto_proveedor')),
add column proveedor_id uuid references public.proveedores(id) on delete restrict,
add column tipo_costo text not null default 'fijo'
check (tipo_costo in ('fijo', 'hora')),
add column numero_activo text;

drop index if exists public.materiales_nombre_unidad_unicos;

create unique index inventario_material_herramienta_nombre_unidad_unicos
on public.materiales (lower(nombre), lower(unidad_medida))
where categoria in ('material', 'herramienta');

create unique index inventario_producto_proveedor_nombre_unidad_unicos
on public.materiales (proveedor_id, lower(nombre), lower(unidad_medida))
where categoria = 'producto_proveedor';

create unique index inventario_herramienta_numero_activo_unico
on public.materiales (lower(numero_activo))
where categoria = 'herramienta';

alter table public.materiales
add constraint inventario_campos_por_categoria check (
  (
    categoria = 'material'
    and proveedor_id is null
    and numero_activo is null
    and tipo_costo = 'fijo'
  )
  or (
    categoria = 'herramienta'
    and proveedor_id is null
    and length(trim(numero_activo)) > 0
    and tipo_costo = 'fijo'
    and costo_referencial is not null
  )
  or (
    categoria = 'producto_proveedor'
    and proveedor_id is not null
    and numero_activo is null
    and costo_referencial is not null
  )
);

create index inventario_categoria_activo_idx
on public.materiales (categoria, activo, nombre);

create index inventario_proveedor_idx
on public.materiales (proveedor_id)
where proveedor_id is not null;

comment on table public.materiales is
  'Inventario unificado: materiales, herramientas y productos provistos por proveedores.';
comment on column public.materiales.categoria is
  'material, herramienta o producto_proveedor.';
comment on column public.materiales.tipo_costo is
  'Los productos de proveedor pueden ser de costo fijo o por hora; el resto usa costo fijo.';
comment on column public.materiales.numero_activo is
  'Identificador único y obligatorio para herramientas.';
