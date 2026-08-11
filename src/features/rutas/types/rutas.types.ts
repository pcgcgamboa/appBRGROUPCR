export type EstadoVehiculoRuta = 'disponible' | 'en_uso' | 'mantenimiento'
export type EstadoOperarioRuta = 'disponible' | 'en_ruta' | 'ocupado'
export type EstadoCheckpoint = 'pendiente' | 'en_transito' | 'llego'

export interface RutaOperario {
  operario_id: string
  estado: EstadoOperarioRuta
  operario: { nombre_completo: string } | null
}

export interface RutaSolicitud {
  solicitud_id: string
  vehiculo_id: string | null
  provincia: string
  canton: string
  distrito: string
  otras_senas: string | null
  latitud: number | null
  longitud: number | null
  estado_vehiculo: EstadoVehiculoRuta
  estado_checkpoint: EstadoCheckpoint
  vehiculo: { placa: string; tipo: string } | null
  ruta_operarios: RutaOperario[]
}

export interface SolicitudParaRuta {
  id: string
  numero: number
  nombre: string
  estado: string
  operador_id: string | null
  cliente: { nombre: string } | null
  ubicacion: {
    provincia: string
    canton: string
    distrito: string
    otras_senas: string | null
    latitud: number | null
    longitud: number | null
  } | null
  ruta: RutaSolicitud | null
}

export interface ControlRutaInput {
  solicitud_id: string
  vehiculo_id: string
  provincia: string
  canton: string
  distrito: string
  otras_senas: string
  latitud: number | null
  longitud: number | null
  estado_vehiculo: EstadoVehiculoRuta
  estado_checkpoint: EstadoCheckpoint
  operarios: { operario_id: string; estado: EstadoOperarioRuta }[]
}
