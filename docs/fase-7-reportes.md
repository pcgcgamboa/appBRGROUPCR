# Fase 7 — Reportes y dashboard

## Alcance

El Administrador y el Encargado disponen de una vista consolidada con:

- Total de solicitudes, solicitudes activas, urgentes y con SLA vencido.
- Distribución por estado.
- Distribución por prioridad, incluida la categoría sin definir.
- Distribución de urgencias entre finalizadas, vencidas y aún dentro del plazo.

Los gráficos se adaptan al ancho disponible y ofrecen detalle al pasar el cursor.

## Seguridad y cálculo

La función PostgreSQL `obtener_dashboard_solicitudes()` genera todos los agregados en una sola consulta. Solo los usuarios autenticados con rol `administrador` o `encargado` pueden ejecutarla; las políticas RLS continúan delimitando el acceso a los datos base.

Una solicitud se considera activa mientras no esté cerrada, cancelada o rechazada. El indicador de SLA vencido cuenta solicitudes activas cuya fecha límite ya pasó. Para las urgentes, una solicitud finalizada es la que alcanzó el estado atendida o cerrada.

## Despliegue

Aplicar la migración pendiente antes de usar el dashboard contra el proyecto remoto:

```shell
supabase db push
```
