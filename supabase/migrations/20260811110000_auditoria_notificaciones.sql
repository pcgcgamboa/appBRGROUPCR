create table public.notificaciones_envios (
  id uuid primary key default gen_random_uuid(),
  solicitud_id uuid not null references public.solicitudes(id) on delete cascade,
  estado public.estado_solicitud not null,
  destinatario text,
  resultado text not null check (resultado in ('pendiente', 'enviado', 'error')),
  detalle_error text,
  creado_en timestamptz not null default now(),
  enviado_en timestamptz
);

create index notificaciones_envios_solicitud_idx
on public.notificaciones_envios (solicitud_id, creado_en desc);

alter table public.notificaciones_envios enable row level security;

create policy notificaciones_envios_lectura
on public.notificaciones_envios for select to authenticated
using (public.es_gestor());

revoke all on public.notificaciones_envios from anon;
grant select on public.notificaciones_envios to authenticated;

comment on table public.notificaciones_envios is
  'Auditoría de intentos de correo por cambios de estado configurados.';
