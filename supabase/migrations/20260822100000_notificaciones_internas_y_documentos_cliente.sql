create table public.notificaciones_internas (
  id bigint generated always as identity primary key,
  tipo text not null check(tipo in ('bolsa_empleo','cliente')),
  titulo text not null,
  mensaje text not null,
  entidad_tipo text not null,
  entidad_id text not null,
  roles_destino text[] not null default array['administrador','encargado'],
  creado_en timestamptz not null default now()
);
create table public.notificaciones_internas_lecturas (
  notificacion_id bigint not null references public.notificaciones_internas(id) on delete cascade,
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  leida_en timestamptz not null default now(),
  primary key(notificacion_id,usuario_id)
);
create index notificaciones_internas_fecha_idx on public.notificaciones_internas(creado_en desc);
alter table public.notificaciones_internas enable row level security;
alter table public.notificaciones_internas_lecturas enable row level security;
create policy notificaciones_internas_lectura on public.notificaciones_internas for select to authenticated
using(exists(select 1 from unnest(roles_destino) rol where public.tiene_rol(rol)));
create policy notificaciones_lecturas_propias on public.notificaciones_internas_lecturas
for select to authenticated using(usuario_id=auth.uid());
create policy notificaciones_marcar_leida on public.notificaciones_internas_lecturas
for insert to authenticated with check(usuario_id=auth.uid() and exists(
  select 1 from public.notificaciones_internas n where n.id=notificacion_id
));
create policy notificaciones_desmarcar_leida on public.notificaciones_internas_lecturas
for delete to authenticated using(usuario_id=auth.uid());
grant select on public.notificaciones_internas to authenticated;
grant select,insert,delete on public.notificaciones_internas_lecturas to authenticated;

create or replace function public.notificar_cambio_cliente()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_campos text[]:=array[]::text[];
begin
  if tg_op='INSERT' then
    insert into public.notificaciones_internas(tipo,titulo,mensaje,entidad_tipo,entidad_id)
    values('cliente','Nuevo Cliente registrado',new.nombre || ' fue incorporado al sistema.','clientes',new.id::text);
  else
    if new.nombre is distinct from old.nombre then v_campos:=array_append(v_campos,'nombre'); end if;
    if new.identificacion is distinct from old.identificacion then v_campos:=array_append(v_campos,'identificación'); end if;
    if new.email_contacto is distinct from old.email_contacto then v_campos:=array_append(v_campos,'correo'); end if;
    if new.telefono_contacto is distinct from old.telefono_contacto then v_campos:=array_append(v_campos,'teléfono'); end if;
    if new.activo is distinct from old.activo then v_campos:=array_append(v_campos,'estado'); end if;
    if cardinality(v_campos)>0 then
      insert into public.notificaciones_internas(tipo,titulo,mensaje,entidad_tipo,entidad_id)
      values('cliente','Datos de Cliente actualizados',new.nombre || ': se modificó ' || array_to_string(v_campos,', ') || '.','clientes',new.id::text);
    end if;
  end if;
  return new;
end $$;
create trigger notificar_cambio_cliente after insert or update on public.clientes
for each row execute function public.notificar_cambio_cliente();

create or replace function public.notificar_cambio_bolsa_empleo()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  insert into public.notificaciones_internas(tipo,titulo,mensaje,entidad_tipo,entidad_id,roles_destino)
  values('bolsa_empleo',case when tg_op='INSERT' then 'Nueva postulación en bolsa de empleo' else 'Postulación actualizada' end,
    new.nombre_completo || ' · ' || new.especialidad || ' · estado ' || new.estado || '.',
    'postulaciones_tecnicos',new.id::text,array['administrador','encargado']);
  return new;
end $$;
create trigger notificar_cambio_bolsa_empleo after insert or update of estado on public.postulaciones_tecnicos
for each row execute function public.notificar_cambio_bolsa_empleo();

-- El Cliente puede aportar documentos a su expediente, pero no editarlos ni eliminarlos.
drop policy cliente_documentos_crear on public.cliente_documentos;
create policy cliente_documentos_crear on public.cliente_documentos for insert to authenticated
with check(subido_por=auth.uid() and (public.es_gestor() or cliente_id=public.cliente_del_usuario()));
drop policy storage_clientes_documentos_crear on storage.objects;
create policy storage_clientes_documentos_crear on storage.objects for insert to authenticated
with check(bucket_id='clientes-documentos' and owner_id=auth.uid()::text and (
  public.es_gestor() or ((storage.foldername(name))[1])::uuid=public.cliente_del_usuario()
));
