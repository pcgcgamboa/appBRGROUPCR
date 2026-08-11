# Fase 3 — Solicitudes, estados y SLA

## Flujos implementados

- El solicitante crea una solicitud para su propio cliente y una ubicación asociada.
- Puede adjuntar JPEG, PNG, WebP o PDF, con límite de 10 MB por archivo.
- El Encargado revisa solicitudes creadas, define prioridad y asigna un único operador.
- El Encargado puede rechazar con motivo, reasignar y aplicar transiciones válidas.
- Una solicitud cerrada puede reabrirse sin límite de tiempo.
- Los usuarios multirrol pueden cambiar entre los módulos habilitados.

## SLA

La Edge Function `gestionar-solicitud` obtiene las horas desde `tipo_solicitud_sla` y guarda una copia en la solicitud. El vencimiento se calcula desde la creación original, no desde la asignación. Las urgentes nunca pueden superar 24 horas.

Valores iniciales asumidos ante la ausencia de una matriz exacta:

| Prioridad | Horas |
|---|---:|
| Baja | 120 |
| Media | 72 |
| Alta | 48 |
| Urgente | 24 |

Cada tipo nuevo recibe esta matriz automáticamente. El Administrador puede modificarla directamente en Supabase; una interfaz específica puede agregarse junto con la configuración avanzada.

## Seguridad y auditoría

La Edge Function valida el rol `administrador` o `encargado`, pero ejecuta los cambios con el JWT del usuario. De esta forma se aplican las políticas RLS y el historial conserva el usuario real en `cambiado_por`.

## Despliegue

```shell
supabase db push
supabase functions deploy gestionar-solicitud
```

También debe existir el bucket privado creado por las migraciones de la Fase 1.
