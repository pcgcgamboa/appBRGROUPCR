-- Auditoría de envíos de WhatsApp (mensajes y documentos) a clientes y usuarios del sistema,
-- disparados manualmente por un gestor desde el Edge Function enviar-whatsapp. A diferencia de
-- notificaciones_envios, no hay cola de reintento con cron: el envío es síncrono contra el bridge
-- local de whatsapp-web.js (ver whatsapp-bridge/), así que esta tabla es solo el registro de lo
-- que pasó, no una cola pendiente.
create table public.whatsapp_envios (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('mensaje', 'documento')),
  destinatario_tipo text not null check (destinatario_tipo in ('cliente', 'usuario')),
  destinatario_id uuid not null,
  telefono text not null,
  mensaje text,
  documento_ruta_storage text,
  documento_nombre text,
  resultado text not null check (resultado in ('enviado', 'error')),
  detalle_error text,
  enviado_por uuid references public.usuarios(id) on delete set null,
  creado_en timestamptz not null default now(),
  constraint whatsapp_envios_documento_chk
    check (tipo <> 'documento' or (documento_ruta_storage is not null and documento_nombre is not null))
);

create index whatsapp_envios_destinatario_idx
  on public.whatsapp_envios (destinatario_tipo, destinatario_id, creado_en desc);

alter table public.whatsapp_envios enable row level security;

-- Mismo criterio de lectura que notificaciones_envios: solo gestores (administrador/encargado)
-- pueden ver el historial de envíos.
create policy whatsapp_envios_lectura
on public.whatsapp_envios for select to authenticated
using (public.es_gestor());

-- Sin insert/update/delete para authenticated: el Edge Function escribe con service_role, igual
-- que notificaciones_envios.
revoke all on public.whatsapp_envios from anon;
grant select on public.whatsapp_envios to authenticated;

comment on table public.whatsapp_envios is
  'Auditoría de mensajes y documentos enviados por WhatsApp vía el bridge local de whatsapp-web.js.';
