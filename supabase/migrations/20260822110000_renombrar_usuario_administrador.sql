update public.usuarios as usuario
set nombre_completo = 'Administrador'
from auth.users as cuenta
where cuenta.id = usuario.id
  and lower(cuenta.email) = lower('pablo.gamboa@gmail.com');

update auth.users
set raw_user_meta_data = jsonb_set(
  coalesce(raw_user_meta_data, '{}'::jsonb),
  '{nombre_completo}',
  to_jsonb('Administrador'::text),
  true
)
where lower(email) = lower('pablo.gamboa@gmail.com');
