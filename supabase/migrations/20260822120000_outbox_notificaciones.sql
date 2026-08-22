-- Outbox con reintentos para notificaciones_envios: el job de pg_cron
-- `procesar-notificaciones-pendientes` invoca cada 5 minutos la Edge Function del mismo nombre,
-- que reintenta los envíos que quedaron en 'pendiente' (por ejemplo si EdgeRuntime.waitUntil no
-- alcanzó a completar antes de que la instancia se apagara) o en 'error' (falla de SMTP), con
-- backoff simple y un tope de 3 intentos. No requiere reescribir la lógica de envío: reutiliza
-- enviarNotificacionPendiente ya existente en supabase/functions/_shared/notificaciones.ts.

create extension if not exists pg_cron;
create extension if not exists pg_net;

alter table public.notificaciones_envios
  add column intentos integer not null default 1,
  add column siguiente_intento_en timestamptz;

comment on column public.notificaciones_envios.intentos is
  'Cantidad de intentos de envío realizados, incluido el original (arranca en 1). Tope de 3 antes de dejar de reintentar automáticamente.';
comment on column public.notificaciones_envios.siguiente_intento_en is
  'No reintentar antes de esta fecha. Backoff simple: 5, 15 y 30 minutos tras cada intento fallido.';

create index notificaciones_envios_reintento_idx on public.notificaciones_envios(siguiente_intento_en)
  where resultado in ('pendiente', 'error');

-- Reclama hasta p_limite notificaciones vencidas de reintento: bloquea las filas elegidas
-- (`for update skip locked`, para que ejecuciones de cron superpuestas nunca procesen la misma
-- fila dos veces), incrementa el contador de intentos y calcula el próximo backoff, y devuelve los
-- datos necesarios para reenviar sin otra consulta. Solo se otorga a `service_role`: la Edge
-- Function que la invoca corre con la clave de servicio, nunca con el JWT de un usuario.
create or replace function public.reclamar_notificaciones_pendientes(p_limite integer default 20)
returns table (
  id uuid,
  destinatario text,
  estado text,
  numero bigint,
  nombre text,
  cliente_nombre text
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  with elegidas as (
    select ne.id
    from public.notificaciones_envios ne
    where ne.resultado in ('pendiente', 'error')
      and ne.intentos < 3
      and (ne.siguiente_intento_en is null or ne.siguiente_intento_en <= now())
    order by ne.creado_en
    limit p_limite
    for update of ne skip locked
  ),
  actualizadas as (
    update public.notificaciones_envios n
    set intentos = n.intentos + 1,
        siguiente_intento_en = now() + (least(n.intentos, 3) * interval '5 minutes')
    from elegidas
    where n.id = elegidas.id
    returning n.id, n.destinatario, n.estado, n.solicitud_id
  )
  select a.id, a.destinatario, a.estado::text, s.numero, s.nombre, c.nombre
  from actualizadas a
  join public.solicitudes s on s.id = a.solicitud_id
  join public.clientes c on c.id = s.cliente_id;
end $$;

revoke all on function public.reclamar_notificaciones_pendientes(integer) from public;
grant execute on function public.reclamar_notificaciones_pendientes(integer) to service_role;

comment on function public.reclamar_notificaciones_pendientes(integer) is
  'Outbox: reclama y marca para reintento las notificaciones pendientes/con error vencidas de backoff. Invocada únicamente por la Edge Function procesar-notificaciones-pendientes.';

-- Programa la revisión cada 5 minutos. Requiere dos secretos en Supabase Vault que este archivo
-- NO crea (los valores dependen del entorno — dev/staging/prod tienen URLs distintas — así que no
-- corresponde fijarlos en una migración compartida). Antes de que el job funcione, ejecutar UNA
-- VEZ contra el proyecto de destino (ver docs/informe-arquitectura-fase-2.md para el detalle):
--
--   select vault.create_secret('https://<project-ref>.supabase.co', 'notif_functions_base_url');
--   select vault.create_secret('<anon/publishable key>', 'notif_publishable_key');
--
-- Hasta que esos secretos existan, el job se ejecutará sin efecto (net.http_post fallará al no
-- encontrar el secreto) — no rompe nada, solo no reintenta hasta completar ese paso manual.
select cron.schedule(
  'procesar-notificaciones-pendientes',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'notif_functions_base_url') || '/functions/v1/procesar-notificaciones-pendientes',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'notif_publishable_key'),
      -- El gateway de Edge Functions exige `Authorization: Bearer <jwt>` cuando verify_jwt está
      -- activo (el caso por defecto: procesar-notificaciones-pendientes no tiene una excepción
      -- propia en supabase/config.toml). La clave anon/publishable ya ES un JWT válido firmado por
      -- el proyecto, así que sirve como portador aquí igual que `apikey` — sin este header, el
      -- gateway rechaza la llamada con 401 antes de que el código de la función se ejecute nunca.
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'notif_publishable_key')
    ),
    body := '{}'::jsonb
  ) as request_id;
  $$
);
