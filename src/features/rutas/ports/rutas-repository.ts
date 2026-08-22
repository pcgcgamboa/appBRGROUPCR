import type { ControlRutaInput, SolicitudParaRuta } from '@/features/rutas/types/rutas.types'

/**
 * Puerto del dominio `rutas`: define el contrato de acceso a datos sin
 * atarse a Supabase. Los hooks de React consumen esta interfaz; el adaptador
 * concreto (`adapters/supabase-rutas-repository.ts`) la implementa con
 * supabase-js. Esto permite sustituirla por un fake en pruebas unitarias sin
 * tocar los hooks ni los componentes.
 */
export interface RutasRepository {
  solicitudesParaRuta(): Promise<SolicitudParaRuta[]>
  guardarControlRuta(input: ControlRutaInput): Promise<void>
}
