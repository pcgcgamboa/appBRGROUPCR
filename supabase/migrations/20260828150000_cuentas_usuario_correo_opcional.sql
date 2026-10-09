create table public.usuario_cuentas (
  usuario_id uuid primary key references public.usuarios(id) on delete cascade,
  cuenta text not null,
  correo text,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint usuario_cuentas_formato_check check (
    cuenta = lower(cuenta)
    and cuenta ~ '^[a-z0-9][a-z0-9._-]{2,49}$'
  ),
  constraint usuario_cuentas_correo_check check (
    correo is null
    or correo ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
  )
);

create unique index usuario_cuentas_cuenta_unica
on public.usuario_cuentas(lower(cuenta));

create trigger usuario_cuentas_actualizado
before update on public.usuario_cuentas
for each row execute function public.actualizar_marca_tiempo();

alter table public.usuario_cuentas enable row level security;
revoke all on public.usuario_cuentas from anon, authenticated;

comment on table public.usuario_cuentas is
  'Identidad privada de acceso. Solo funciones con service_role pueden resolver una cuenta.';
comment on column public.usuario_cuentas.correo is
  'Correo de contacto opcional; no se utiliza como identificador de autenticación.';

with candidatas as (
  select
    usuario.id as usuario_id,
    coalesce(
      nullif(regexp_replace(lower(split_part(cuenta.email, '@', 1)), '[^a-z0-9._-]+', '', 'g'), ''),
      'usuario'
    ) as base,
    case
      when cuenta.email is null or cuenta.email like '%@accounts.invalid' then null
      else lower(cuenta.email)
    end as correo
  from public.usuarios usuario
  join auth.users cuenta on cuenta.id = usuario.id
), numeradas as (
  select *, row_number() over(partition by base order by usuario_id) as numero
  from candidatas
)
insert into public.usuario_cuentas(usuario_id, cuenta, correo)
select
  usuario_id,
  case
    when numero = 1 and length(base) >= 3 then left(base, 50)
    else left(case when length(base) >= 3 then base else 'usuario' end, 40)
      || '-' || left(usuario_id::text, 8)
  end,
  correo
from numeradas
on conflict(usuario_id) do nothing;
