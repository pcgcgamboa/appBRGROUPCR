# Fase 4 — Control de ruta

## Alcance implementado

- Una ruta por solicitud, garantizada por la clave primaria `rutas.solicitud_id`.
- Selección de uno o más operarios con estado individual.
- Selección de vehículo del catálogo con estado independiente dentro de la ruta.
- Checkpoint de ubicación independiente.
- Provincia, cantón, distrito, otras señas y coordenadas.
- Visualización responsive mediante Leaflet y mosaicos de OpenStreetMap.

## Estados

| Elemento | Estados |
|---|---|
| Operario | Disponible, En ruta, Ocupado |
| Vehículo en ruta | Disponible, En uso, Mantenimiento |
| Checkpoint | Pendiente, En tránsito, Llegó |

El estado del vehículo almacenado en la ruta representa esa asignación particular y no reemplaza automáticamente el estado general del catálogo.

## Integridad

La función PostgreSQL `guardar_control_ruta` ejecuta en una sola transacción:

1. Validación del rol Administrador o Encargado.
2. Validación del estado de la solicitud.
3. Validación del vehículo activo.
4. Validación de cada operario activo con rol `operador`.
5. Inserción o actualización de la ruta.
6. Reemplazo de las asignaciones de operarios.

Si alguna validación falla, ningún cambio parcial queda almacenado.

## Supuesto

Cuando la ubicación del cliente no tiene coordenadas, el Encargado las ingresa manualmente. No se agregó geocodificación automática para evitar depender de un servicio externo con límites o licenciamiento adicionales.
