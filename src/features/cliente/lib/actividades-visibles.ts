/**
 * Tipos de `solicitud_actividades` que el Cliente puede ver. Misma lista que la política RLS
 * `solicitud_actividades_lectura` (migración 20261012100000); se repite en las consultas del portal
 * para que un usuario que además tenga un rol de proveedor tampoco vea ahí movimientos internos
 * (asignaciones, rutas, flota, técnicos, materiales, peticiones, ediciones, automatizaciones).
 */
export const ACTIVIDADES_VISIBLES_CLIENTE = [
  'estado',
  'avance',
  'adjunto',
  'comunicacion',
  'proforma',
  'visita',
  'garantia',
  'validacion',
] as const
