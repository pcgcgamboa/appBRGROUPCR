export type EstadoRutaProceso = 'planificada' | 'en_curso' | 'finalizada' | 'cancelada'
export type TipoMovimientoVehiculo = 'combustible' | 'kilometraje' | 'lavado' | 'otro'

export interface RutaProceso {
  id: string
  codigo: string
  nombre: string
  descripcion: string | null
  fecha_programada: string
  estado: EstadoRutaProceso
  responsable_id: string
  responsable: { nombre_completo: string } | null
  ruta_solicitudes: {
    solicitud_id: string
    orden: number
    solicitud: { numero: number; nombre: string } | null
  }[]
  ruta_vehiculos: {
    vehiculo_id: string
    es_principal: boolean
    vehiculo: { placa: string; tipo: string; kilometraje_actual: number } | null
  }[]
  ruta_participantes: ParticipanteRuta[]
}

export interface ParticipanteRuta {
  usuario_id: string
  viatico: number
  detalle_viatico: string | null
  usuario: { nombre_completo: string } | null
}

export interface ResponsableRuta {
  id: string
  nombre_completo: string
  usuario_roles: { rol: { codigo: string } | null }[]
}

export interface RutaProcesoInput {
  id?: string
  codigo: string
  nombre: string
  descripcion: string
  fecha: string
  estado: EstadoRutaProceso
  responsable_id: string
  solicitudes: string[]
  vehiculos: string[]
  participantes: Array<{
    usuario_id: string
    viatico: number
    detalle_viatico: string
  }>
}

export interface RutaGasto {
  id: string
  ruta_id: string
  participante_id: string | null
  concepto: string
  monto: number
  fecha: string
  detalle: string | null
  participante: { nombre_completo: string } | null
}

export interface RutaGastoInput {
  ruta_id: string
  participante_id: string | null
  concepto: string
  monto: number
  fecha: string
  detalle: string | null
}
export interface MovimientoVehiculoInput {
  ruta_id: string
  vehiculo_id: string
  tipo: TipoMovimientoVehiculo
  cantidad: number | null
  unidad: string | null
  monto: number
  detalle: string | null
  fecha: string
  kilometraje_actual: number | null
}

export interface FotoVehiculo {
  id: string
  vehiculo_id: string
  nombre_archivo: string
  ruta_storage: string
  mime_type: string
  tamano_bytes: number
  descripcion: string | null
  creado_en: string
  url?: string
}

export interface SubirFotosVehiculoInput {
  vehiculoId: string
  archivos: File[]
  descripcion: string
}

export interface GestionVehiculoInput {
  clase: 'indisponibilidad' | 'gasto'
  vehiculo_id: string
  razon?: string
  detalle?: string
  inicio?: string
  fin?: string | null
  tipo?: string
  concepto?: string
  monto?: number
  fecha?: string
}

export interface MovimientoVehiculoResumen {
  id: string
  tipo: TipoMovimientoVehiculo
  cantidad: number | null
  unidad: string | null
  monto: number
  detalle: string | null
  fecha: string
  ruta: { codigo: string } | null
  vehiculo: { placa: string } | null
}

export interface VehiculoIndisponibilidad {
  id: string
  razon: string
  detalle: string | null
  inicio: string
  fin: string | null
  vehiculo: { placa: string } | null
}

export interface VehiculoGasto {
  id: string
  tipo: string
  concepto: string
  monto: number
  fecha: string
  vehiculo: { placa: string } | null
}

export interface HistorialVehiculos {
  indisponibilidades: VehiculoIndisponibilidad[]
  gastos: VehiculoGasto[]
}

export interface ActividadRuta {
  id: number
  tipo: string
  titulo: string
  descripcion: string | null
  creado_en: string
  actor: { nombre_completo: string } | null
}

export interface ReporteFlota {
  totales: {
    rutas: number
    kilometros: number
    gasto_operativo: number
    gasto_flota: number
    viaticos: number
  }
  rutas: Array<{
    id: string
    codigo: string
    nombre: string
    fecha: string
    estado: string
    responsable: string
    solicitudes: number
    vehiculos: number
    kilometros: number
    viaticos: number
    gastos: number
  }>
  vehiculos: Array<{
    id: string
    placa: string
    tipo: string
    estado: string
    kilometros: number
    gasto_operativo: number
    gasto_flota: number
    depreciacion_acumulada: number
  }>
}
