import type { Tecnico } from '@/features/catalogos/types/catalogos.types'

export interface TecnicosSolicitud {
  tecnicos: Tecnico[]
  asignados: string[]
}

export interface AsignarTecnicosInput {
  solicitudId: string
  tecnicos: string[]
}

/**
 * Puerto del dominio `tecnicos`: define el contrato de acceso a datos sin
 * atarse a Supabase. Los hooks de React consumen esta interfaz; el adaptador
 * concreto (`adapters/supabase-tecnicos-repository.ts`) la implementa con
 * supabase-js. Esto permite sustituirla por un fake en pruebas unitarias sin
 * tocar los hooks ni los componentes.
 */
export interface TecnicosRepository {
  tecnicosSolicitud(solicitudId: string): Promise<TecnicosSolicitud>
  asignarTecnicos(input: AsignarTecnicosInput): Promise<void>
}
