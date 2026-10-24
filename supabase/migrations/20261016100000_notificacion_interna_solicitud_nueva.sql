-- Aviso interno (campana del menú "Notificaciones") cuando una solicitud del Cliente/Solicitante
-- llega al proveedor. Hasta ahora "solicitud nueva" solo generaba el correo de
-- avisar_solicitud_nueva (notificaciones_envios), así que el contador del menú no se enteraba.
-- Se dispara en el mismo momento que ese correo: al pasar a "enviada" (envío del borrador del
-- portal, o inserción que nace enviada), no al guardar el borrador.

-- 1. Nuevo tipo de notificación interna.
alter table public.notificaciones_internas drop constraint if exists notificaciones_internas_tipo_check;
alter table public.notificaciones_internas add constraint notificaciones_internas_tipo_check
  check (tipo in ('bolsa_empleo', 'cliente', 'solicitud'));

-- 2. Trigger. Se excluyen:
--    - las garantías (solicitud_original_id): enviar_solicitud ya inserta su propio aviso
--      "Garantía aplicada sobre la solicitud #…";
--    - lo que registra un gestor (administrador/encargado): no tiene sentido avisarle de su
--      propia acción.
create or replace function public.notificar_solicitud_nueva_interna()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cliente text;
begin
  if new.estado <> 'enviada' or (tg_op = 'UPDATE' and old.estado = 'enviada') then
    return new;
  end if;
  if new.solicitud_original_id is not null or public.es_gestor(auth.uid()) then
    return new;
  end if;
  select nombre into v_cliente from public.clientes where id = new.cliente_id;
  insert into public.notificaciones_internas (tipo, titulo, mensaje, entidad_tipo, entidad_id)
  values (
    'solicitud',
    concat('Nueva solicitud #', new.numero),
    concat(new.nombre, ' — cliente ', coalesce(v_cliente, '—'), '.'),
    'solicitud',
    new.id::text
  );
  return new;
end $$;

drop trigger if exists notificar_solicitud_nueva_interna on public.solicitudes;
create trigger notificar_solicitud_nueva_interna after insert or update of estado on public.solicitudes
for each row execute function public.notificar_solicitud_nueva_interna();
