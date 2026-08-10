# Fase 2 — Administración

## Módulos

- Clientes y ubicaciones asociadas.
- Tipos de solicitud.
- Materiales.
- Vehículos.
- Usuarios de Supabase Auth y asignación de múltiples roles.
- Catálogo de roles.
- Intervención sobre solicitudes activas respetando la máquina de estados.

## Gestión segura de usuarios

El navegador invoca la Edge Function `admin-users`. Esta valida que la sesión tenga el rol `administrador` antes de utilizar el cliente administrativo de Supabase. La clave `service_role` permanece dentro del entorno administrado de la función.

La función evita que un administrador modifique o elimine su propia cuenta, reduciendo el riesgo de dejar el sistema sin acceso administrativo.

## Despliegue requerido

```shell
supabase db push
supabase functions deploy admin-users
```

Las pantallas funcionan contra el proyecto indicado en `.env.local`. Sin una instancia vinculada, se muestra la pantalla de configuración de la Fase 1.

## Supuestos

- La eliminación física de catálogos solo procede cuando no existen relaciones protegidas por claves foráneas; en caso contrario, se debe marcar el registro como inactivo.
- La asignación inicial de prioridad, operador y SLA pertenece al flujo detallado de la Fase 3. En esta fase el Administrador puede reasignar solicitudes que ya estén asignadas e intervenir en sus transiciones válidas.
