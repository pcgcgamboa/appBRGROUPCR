// Lista fija en código (no configurable por el administrador) de categorías de foto del reporte
// de atención — el administrador solo activa/desactiva un subconjunto por cliente, ver
// clientes_plantilla_reporte.categorias_fotos_habilitadas.
export const CATEGORIAS_FOTO_REPORTE = [
  { valor: 'estado_inicial', etiqueta: 'Estado inicial' },
  { valor: 'trabajo_en_proceso', etiqueta: 'Trabajo en proceso' },
  { valor: 'resultado_final', etiqueta: 'Resultado final' },
  { valor: 'placa_serie', etiqueta: 'Placa / número de serie' },
  { valor: 'otro', etiqueta: 'Otro' },
] as const

export type CategoriaFotoReporte = (typeof CATEGORIAS_FOTO_REPORTE)[number]['valor']

export function etiquetaCategoriaFoto(valor: string | null | undefined): string {
  return CATEGORIAS_FOTO_REPORTE.find((item) => item.valor === valor)?.etiqueta ?? 'Sin categoría'
}
