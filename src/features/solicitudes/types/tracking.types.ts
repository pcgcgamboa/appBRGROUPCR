export type ActividadSolicitud = {
  id: number
  solicitud_id: string
  tipo: string
  titulo: string
  descripcion: string | null
  datos: Record<string, unknown>
  creado_en: string
  actor: { nombre_completo: string } | null
}
