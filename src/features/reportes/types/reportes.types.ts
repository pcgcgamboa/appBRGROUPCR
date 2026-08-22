export interface DatoGrafica {
  nombre: string
  cantidad: number
}

export interface DashboardSolicitudes {
  totales: {
    total: number
    activas: number
    urgentes: number
    sla_vencidas: number
  }
  por_estado: DatoGrafica[]
  por_prioridad: DatoGrafica[]
  por_urgencia: DatoGrafica[]
}

export interface ReporteCostosMateriales {
  total: number
  por_solicitud: {
    id: string
    numero: number
    nombre: string
    cliente: string
    registros_materiales: number
    costo_total: number
  }[]
  por_ruta: {
    id: string
    codigo: string
    nombre: string
    fecha: string
    encargado: string
    solicitudes: number
    costo_total: number
  }[]
  por_encargado: {
    id: string
    encargado: string
    rutas: number
    solicitudes: number
    costo_total: number
  }[]
}
