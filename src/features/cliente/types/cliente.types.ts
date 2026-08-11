export interface SolicitudCliente {
  id: string
  numero: number
  nombre: string
  detalle: string
  estado: 'atendida' | 'cerrada'
  atendida_en: string | null
  cerrada_en: string | null
  tipo: { nombre: string } | null
  operador: { nombre_completo: string } | null
  validacion: {
    satisfecho: boolean
    comentario: string | null
    validado_en: string
  } | null
}
