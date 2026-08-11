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
