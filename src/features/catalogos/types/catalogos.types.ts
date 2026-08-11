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
  activo: boolean
}

export interface Material extends EntidadBase {
  id: string
  nombre: string
  descripcion: string | null
  unidad_medida: string
  costo_referencial: number | null
  activo: boolean
}

export interface Vehiculo extends EntidadBase {
  id: string
  placa: string
  capacidad: string | null
  tipo: string
  estado: 'disponible' | 'en_uso' | 'mantenimiento'
  activo: boolean
}

export interface Rol extends EntidadBase {
  id: number
  codigo: string
  nombre: string
  descripcion: string | null
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
  type?: 'text' | 'email' | 'number' | 'textarea' | 'select' | 'checkbox'
  required?: boolean
  options?: OpcionCampo[]
  step?: string
}
