export interface GarantiaInteraccion {
  id: string
  tipo: 'solicitud_atencion' | 'informacion' | 'resolucion'
  detalle: string
  estado: string
  creado_en: string
  autor: { nombre_completo: string } | null
}

export interface VisitaSolicitud {
  id: string
  llegada_estimada: string
  indicaciones: string | null
  creado_en: string
  autor: { nombre_completo: string } | null
}

export interface SeguimientoSolicitud {
  garantia_inicia_en: string | null
  garantia_vence_en: string | null
  interacciones: GarantiaInteraccion[]
  visitas: VisitaSolicitud[]
  equipo: Array<{
    usuario_id: string
    usuario: { nombre_completo: string; foto_url: string | null } | null
  }>
}

export interface GarantiaInput {
  solicitud_id: string
  tipo: 'solicitud_atencion' | 'informacion' | 'resolucion'
  detalle: string
}

export interface VisitaInput {
  solicitud_id: string
  llegada_estimada: string
  indicaciones: string
}
