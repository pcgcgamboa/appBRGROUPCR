# Configuración de Supabase

## Proyecto remoto

1. Crear un proyecto en Supabase.
2. Ejecutar las migraciones de `supabase/migrations` en orden mediante Supabase CLI o el flujo de despliegue del equipo.
3. Copiar la URL y la clave pública (`anon`/publishable) a `.env.local` tomando `.env.example` como base.
4. Mantener la confirmación de correo activa y registrar las URL de redirección de cada ambiente.

## Primer administrador

Después de registrar el usuario en Auth, ejecutar con una cuenta administrativa del servidor:

```sql
insert into public.usuario_roles (usuario_id, rol_id)
select 'UUID-DEL-USUARIO', id
from public.roles
where codigo = 'administrador';
```

La clave `service_role` nunca debe exponerse en variables `VITE_*` ni enviarse al navegador.

## Convención de Storage

Los archivos se guardan en el bucket privado `solicitudes-adjuntos` usando esta estructura:

```text
<solicitud_uuid>/<adjunto_uuid>/<nombre-seguro>
```

Las políticas usan el primer segmento para comprobar acceso a la solicitud.
