alter table public.usuarios
add column costo_hora numeric(14,2) not null default 0 check(costo_hora>=0);
comment on column public.usuarios.costo_hora is 'Costo interno por hora usado para estimar mano de obra en proformas.';

create table public.proformas (
  id uuid primary key default gen_random_uuid(),
  numero bigint generated always as identity unique,
  solicitud_id uuid not null references public.solicitudes(id) on delete cascade,
  titulo text not null default 'Proforma de servicio' check(length(trim(titulo))>0),
  notas text,
  descuento_porcentaje numeric(5,2) not null default 0 check(descuento_porcentaje between 0 and 100),
  impuesto_porcentaje numeric(5,2) not null default 0 check(impuesto_porcentaje between 0 and 100),
  subtotal numeric(14,2) not null default 0 check(subtotal>=0),
  descuento numeric(14,2) not null default 0 check(descuento>=0),
  impuesto numeric(14,2) not null default 0 check(impuesto>=0),
  total numeric(14,2) not null default 0 check(total>=0),
  estado text not null default 'borrador' check(estado in ('borrador','enviada','anulada')),
  creado_por uuid not null references public.usuarios(id) on delete restrict,
  actualizado_por uuid not null references public.usuarios(id) on delete restrict,
  enviado_en timestamptz,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
create index proformas_solicitud_idx on public.proformas(solicitud_id,creado_en desc);
create trigger proformas_actualizada before update on public.proformas
for each row execute function public.actualizar_marca_tiempo();

create table public.proforma_items (
  id uuid primary key default gen_random_uuid(),
  proforma_id uuid not null references public.proformas(id) on delete cascade,
  tipo text not null check(tipo in ('inventario','mano_obra','manual','otro')),
  origen_id uuid,
  descripcion text not null check(length(trim(descripcion))>0),
  cantidad numeric(12,2) not null check(cantidad>0),
  unidad text not null check(length(trim(unidad))>0),
  precio_unitario numeric(14,2) not null check(precio_unitario>=0),
  total numeric(14,2) generated always as (round(cantidad*precio_unitario,2)) stored,
  orden integer not null default 0
);
create index proforma_items_proforma_idx on public.proforma_items(proforma_id,orden,id);

alter table public.proformas enable row level security;
alter table public.proforma_items enable row level security;
create policy proformas_lectura on public.proformas for select to authenticated
using(public.es_gestor() or (estado='enviada' and public.puede_ver_solicitud(solicitud_id)));
create policy proformas_gestion on public.proformas for all to authenticated
using(public.es_gestor()) with check(public.es_gestor());
create policy proforma_items_lectura on public.proforma_items for select to authenticated
using(exists(select 1 from public.proformas p where p.id=proforma_id and (public.es_gestor() or (p.estado='enviada' and public.puede_ver_solicitud(p.solicitud_id)))));
create policy proforma_items_gestion on public.proforma_items for all to authenticated
using(public.es_gestor()) with check(public.es_gestor());
grant select,insert,update,delete on public.proformas,public.proforma_items to authenticated;

create or replace function public.recalcular_proforma(p_proforma_id uuid)
returns void language plpgsql security definer set search_path='' as $$
declare v_subtotal numeric(14,2);v_descuento numeric(14,2);v_impuesto numeric(14,2);v_p public.proformas%rowtype;
begin
  select * into v_p from public.proformas where id=p_proforma_id for update;
  if not found then raise exception 'Proforma no encontrada';end if;
  select coalesce(sum(total),0) into v_subtotal from public.proforma_items where proforma_id=p_proforma_id;
  v_descuento:=round(v_subtotal*v_p.descuento_porcentaje/100,2);
  v_impuesto:=round((v_subtotal-v_descuento)*v_p.impuesto_porcentaje/100,2);
  update public.proformas set subtotal=v_subtotal,descuento=v_descuento,impuesto=v_impuesto,
    total=v_subtotal-v_descuento+v_impuesto where id=p_proforma_id;
end $$;

create or replace function public.generar_proforma_solicitud(p_solicitud_id uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid;v_numero bigint;v_orden integer:=0;
begin
  if not public.es_gestor() then raise exception 'Solo administradores o encargados pueden generar proformas';end if;
  if not exists(select 1 from public.solicitudes where id=p_solicitud_id) then raise exception 'Solicitud no encontrada';end if;
  insert into public.proformas(solicitud_id,creado_por,actualizado_por)
  values(p_solicitud_id,auth.uid(),auth.uid()) returning id,numero into v_id,v_numero;
  insert into public.proforma_items(proforma_id,tipo,origen_id,descripcion,cantidad,unidad,precio_unitario,orden)
  select v_id,'inventario',sm.id,
    case m.naturaleza_provision when 'servicio' then 'Servicio: ' else '' end||m.nombre,
    sm.cantidad,m.unidad_medida,coalesce(sm.costo_referencial_aplicado,m.costo_referencial,0),
    row_number() over(order by sm.creado_en,sm.id)
  from public.solicitud_materiales sm join public.materiales m on m.id=sm.material_id
  where sm.solicitud_id=p_solicitud_id;
  select coalesce(max(orden),0) into v_orden from public.proforma_items where proforma_id=v_id;
  insert into public.proforma_items(proforma_id,tipo,origen_id,descripcion,cantidad,unidad,precio_unitario,orden)
  select v_id,'mano_obra',a.operador_id,'Mano de obra: '||u.nombre_completo,
    sum(a.horas_trabajadas),'hora',u.costo_hora,v_orden+row_number() over(order by u.nombre_completo)
  from public.avances a join public.usuarios u on u.id=a.operador_id
  where a.solicitud_id=p_solicitud_id group by a.operador_id,u.nombre_completo,u.costo_hora;
  perform public.recalcular_proforma(v_id);
  perform public.registrar_actividad_solicitud(p_solicitud_id,'proforma','Proforma generada',
    'Proforma #'||v_numero||' generada con inventario y horas registradas.',auth.uid(),'proformas',v_id::text,
    jsonb_build_object('proforma_id',v_id,'origen','calculo_automatico'),now());
  return v_id;
end $$;

create or replace function public.guardar_proforma(
  p_proforma_id uuid,p_titulo text,p_notas text,p_descuento numeric,p_impuesto numeric,p_items jsonb
) returns void language plpgsql security definer set search_path='' as $$
declare v_solicitud uuid;v_item jsonb;
begin
  if not public.es_gestor() then raise exception 'Solo administradores o encargados pueden modificar proformas';end if;
  select solicitud_id into v_solicitud from public.proformas where id=p_proforma_id and estado='borrador' for update;
  if not found then raise exception 'La proforma no existe o ya no es editable';end if;
  if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)=0 then raise exception 'Incluya al menos un concepto';end if;
  update public.proformas set titulo=trim(p_titulo),notas=nullif(trim(p_notas),''),
    descuento_porcentaje=p_descuento,impuesto_porcentaje=p_impuesto,actualizado_por=auth.uid()
  where id=p_proforma_id;
  delete from public.proforma_items where proforma_id=p_proforma_id;
  for v_item in select value from jsonb_array_elements(p_items) loop
    insert into public.proforma_items(proforma_id,tipo,origen_id,descripcion,cantidad,unidad,precio_unitario,orden)
    values(p_proforma_id,coalesce(v_item->>'tipo','manual'),nullif(v_item->>'origen_id','')::uuid,
      trim(v_item->>'descripcion'),(v_item->>'cantidad')::numeric,trim(v_item->>'unidad'),
      (v_item->>'precio_unitario')::numeric,coalesce((v_item->>'orden')::integer,0));
  end loop;
  perform public.recalcular_proforma(p_proforma_id);
  perform public.registrar_actividad_solicitud(v_solicitud,'proforma','Proforma actualizada',
    'Se modificaron conceptos o parámetros de la proforma.',auth.uid(),'proformas',p_proforma_id::text,
    jsonb_build_object('proforma_id',p_proforma_id),now());
end $$;

create or replace function public.enviar_proforma(p_proforma_id uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_p public.proformas%rowtype;v_comunicacion uuid;v_detalle text;
begin
  if not public.es_gestor() then raise exception 'Solo administradores o encargados pueden enviar proformas';end if;
  select * into v_p from public.proformas where id=p_proforma_id and estado='borrador' for update;
  if not found then raise exception 'La proforma no existe o ya fue enviada';end if;
  if not exists(select 1 from public.proforma_items where proforma_id=p_proforma_id) then raise exception 'La proforma no contiene conceptos';end if;
  select string_agg(descripcion||': '||cantidad||' '||unidad||' × ₡'||precio_unitario||' = ₡'||total,E'\n' order by orden,id)
    into v_detalle from public.proforma_items where proforma_id=p_proforma_id;
  insert into public.solicitud_comunicaciones(solicitud_id,tipo,asunto,mensaje,monto,enviado_por)
  values(v_p.solicitud_id,'proforma',v_p.titulo,
    coalesce(v_p.notas||E'\n\n','')||v_detalle||E'\n\nSubtotal: ₡'||v_p.subtotal||
      E'\nDescuento: ₡'||v_p.descuento||E'\nImpuesto: ₡'||v_p.impuesto||E'\nTotal: ₡'||v_p.total,
    v_p.total,auth.uid()) returning id into v_comunicacion;
  update public.proformas set estado='enviada',enviado_en=now(),actualizado_por=auth.uid() where id=p_proforma_id;
  return v_comunicacion;
end $$;

revoke all on function public.recalcular_proforma(uuid) from public;
revoke all on function public.generar_proforma_solicitud(uuid) from public;
grant execute on function public.generar_proforma_solicitud(uuid) to authenticated;
revoke all on function public.guardar_proforma(uuid,text,text,numeric,numeric,jsonb) from public;
grant execute on function public.guardar_proforma(uuid,text,text,numeric,numeric,jsonb) to authenticated;
revoke all on function public.enviar_proforma(uuid) from public;
grant execute on function public.enviar_proforma(uuid) to authenticated;



