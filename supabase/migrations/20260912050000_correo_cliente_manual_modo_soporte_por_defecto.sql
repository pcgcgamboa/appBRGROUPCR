-- El correo al cliente por cambio de estado deja de enviarse automáticamente desde
-- gestionar-solicitud/registrar-avance (ver commit de Edge Functions correspondiente): ahora es una
-- acción explícita ('notificar_cliente' en gestionar-solicitud), disparada por encargado/
-- administrador desde la vista de la solicitud. Como salvaguarda mientras se confirma que esa
-- acción manual funciona en producción, el destino por defecto pasa de la cuenta real del cliente a
-- la cuenta de control (soporte) — el Administrador puede cambiarlo a 'clientes' desde
-- Administración → Correo cuando lo confirme.
alter table public.configuracion_correo alter column modo_envio set default 'soporte';
update public.configuracion_correo set modo_envio = 'soporte' where id = true;
