export interface EntidadBase {
  id: string | number
}

export interface Cliente extends EntidadBase {
  id: string
  nombre: string
  identificacion: string | null
  email_contacto: string | null
  telefono_contacto: string | null
  activo: boolean
}

export interface Ubicacion extends EntidadBase {
  id: string
  cliente_id: string
  nombre: string
  provincia: string
  canton: string
  distrito: string
  otras_senas: string | null
  latitud: number | null
  longitud: number | null
  activa: boolean
}

export interface TipoSolicitud extends EntidadBase {
  id: string
  nombre: string
  descripcion: string | null
  es_garantia: boolean
  activo: boolean
}

export interface EquipoCliente extends EntidadBase {
  id: string
  cliente_id: string
  nombre: string
  marca: string | null
  modelo: string | null
  serie: string | null
  activo: boolean
}

export interface Material extends EntidadBase {
  id: string
  nombre: string
  descripcion: string | null
  unidad_medida: string
  costo_referencial: number | null
  categoria: 'material' | 'herramienta' | 'producto_proveedor'
  naturaleza_provision: 'material' | 'servicio'
  proveedor_id: string | null
  tipo_costo: 'fijo' | 'hora'
  numero_activo: string | null
  activo: boolean
}

export interface Vehiculo extends EntidadBase {
  id: string
  placa: string
  capacidad: string | null
  tipo: string
  estado: 'disponible' | 'en_uso' | 'mantenimiento'
  activo: boolean
  costo_inicial: number | null
  fecha_adquisicion: string | null
  vida_util_meses: number | null
  valor_residual: number
  kilometraje_actual: number
}

export interface Rol extends EntidadBase {
  id: number
  codigo: string
  nombre: string
  descripcion: string | null
}

export interface Tecnico extends EntidadBase {
  id: string
  nombre_completo: string
  identificacion: string | null
  especialidad: 'albanil' | 'soldador' | 'chofer'
  celular: string
  correo: string | null
  direccion: string | null
  contacto_emergencia: string | null
  observaciones: string | null
  activo: boolean
}
export interface Proveedor extends EntidadBase {
  id: string
  nombre: string
  identificacion: string | null
  persona_contacto: string
  telefono: string
  celular: string | null
  correo: string | null
  articulos_provee: string
  provincia: string
  canton: string
  distrito: string
  direccion: string | null
  activo: boolean
}

export interface PlantillaReporte {
  cliente_id: string
  incluir_motivo_visita: boolean
  incluir_checklist_condiciones: boolean
  incluir_fotos_categorizadas: boolean
  incluir_recomendaciones: boolean
  categorias_fotos_habilitadas: string[]
}

export type ValorFormulario = string | number | boolean | null
export type DatosFormulario = Record<string, ValorFormulario>

export interface OpcionCampo {
  value: string
  label: string
}

export interface CampoCatalogo {
  name: string
  label: string
  type?: 'text' | 'email' | 'number' | 'date' | 'textarea' | 'select' | 'checkbox'
  required?: boolean
  options?: OpcionCampo[]
  step?: string
  visibleWhen?: {
    field: string
    equals: ValorFormulario
  }
}
