# Fase 5 — Módulo del Operador

## Funciones implementadas

- Bandeja de solicitudes asignadas al Operador autenticado.
- Diseño responsive para teléfono, tableta y escritorio.
- Registro de horas trabajadas entre 0 y 24 por actualización.
- Porcentaje de avance monotónico entre 0 y 100.
- Bitácora narrativa.
- Cambio de estado restringido al flujo permitido para el Operador.
- Vehículo heredado obligatoriamente desde el control de ruta.
- Materiales existentes o ingresados como texto libre.
- Alta automática de materiales libres en el catálogo general.
- Fotografías con captura nativa HTML5 y documentos PDF.
- Historial de avances, materiales, vehículo y cantidad de adjuntos.

## Operación transaccional

La Edge Function `registrar-avance` invoca `registrar_avance_operador`, que valida y guarda en una sola transacción:

1. Identidad y rol del Operador.
2. Asignación de la solicitud al usuario autenticado.
3. Existencia del vehículo de ruta.
4. Horas, porcentaje, narrativa y transición de estado.
5. Avance y vehículo utilizado.
6. Materiales y alta automática en catálogo.
7. Metadatos de adjuntos.
8. Cambio de estado de la solicitud.

Si cualquier paso falla, la transacción de datos se revierte. Los archivos se cargan antes de invocar la operación y el frontend intenta retirarlos del bucket si la transacción falla.

## Reglas adicionales

- Una solicitud marcada como `atendida` exige 100% de avance.
- El porcentaje no puede ser menor que un avance anterior.
- El Operador no puede cancelar, rechazar, cerrar ni reabrir solicitudes.
- El operador principal debe formar parte del control de ruta.

## Despliegue

```shell
supabase db push
supabase functions deploy registrar-avance
```
