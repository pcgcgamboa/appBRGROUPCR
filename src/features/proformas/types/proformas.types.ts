export interface ProformaItem {
  id?: string
  tipo: 'inventario' | 'mano_obra' | 'manual' | 'otro'
  origen_id: string | null
  descripcion: string
  cantidad: number
  unidad: string
  precio_unitario: number
  total?: number
  orden: number
}
export interface Proforma {
  id: string
  numero: number
  solicitud_id: string
  titulo: string
  notas: string | null
  descuento_porcentaje: number
  impuesto_porcentaje: number
  subtotal: number
  descuento: number
  impuesto: number
  total: number
  estado: 'borrador' | 'enviada' | 'anulada'
  enviado_en: string | null
  creado_en: string
  items: ProformaItem[]
}
export interface GuardarProformaInput {
  id: string
  titulo: string
  notas: string
  descuento: number
  impuesto: number
  items: ProformaItem[]
}
