export interface HerramientaResumen {
  id: string
  nombre: string
  numero_activo: string
  activo: boolean
}
export interface PersonaInventario {
  id: string
  nombre_completo: string
}
export interface AsignacionHerramienta {
  id: string
  herramienta_id: string
  usuario_id: string
  asignada_en: string
  devuelta_en: string | null
  observaciones_entrega: string | null
  observaciones_devolucion: string | null
  herramienta: { nombre: string; numero_activo: string } | null
  usuario: { nombre_completo: string } | null
  asignador: { nombre_completo: string } | null
  receptor: { nombre_completo: string } | null
}
export interface AsignarHerramientaInput {
  herramienta_id: string
  usuario_id: string
  observaciones: string
}
export interface DevolverHerramientaInput {
  asignacion_id: string
  observaciones: string
}
