# Fase 6 — Cliente y notificaciones

## Autogestión del Cliente

- El usuario con rol `cliente` consulta solicitudes atendidas o cerradas de su organización.
- Indica si está satisfecho y puede agregar comentarios.
- Si no está satisfecho, el comentario es obligatorio.
- El Encargado solo puede seleccionar `cerrada` después de existir una validación.
- PostgreSQL vuelve a comprobar la validación antes del cierre.

## Configuración de notificaciones

El Administrador o Encargado activa el correo de manera independiente para cada solicitud y estado:

- Asignada.
- En atención.
- En espera de materiales.
- Atendida.
- Cerrada.
- Cancelada.
- Rechazada.

Cada intento queda en `notificaciones_envios` con resultado pendiente, enviado o error. Un fallo SMTP no revierte el cambio de estado.

## SMTP

La implementación usa `nodemailer` dentro de una Edge Function y admite un servidor SMTP propio. Las credenciales se almacenan como secretos del proyecto, nunca en variables `VITE_*`.

Variables necesarias:

```text
SMTP_HOST
SMTP_PORT
SMTP_SECURE
SMTP_USER
SMTP_PASSWORD
SMTP_FROM
```

Ejemplo de configuración local: `supabase/.env.local.example`.

## Despliegue

```shell
supabase db push
supabase secrets set --env-file supabase/.env.local
supabase functions deploy gestionar-solicitud
supabase functions deploy registrar-avance
```
