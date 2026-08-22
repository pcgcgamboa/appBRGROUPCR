import type { ConfiguracionMarca } from '@/features/configuracion/types/configuracion.types'

export interface ActualizarMarcaInput {
  actual: ConfiguracionMarca
  logo?: File
  icono?: File
}

/**
 * Puerto del dominio `configuracion`: define el contrato de acceso a datos
 * sin atarse a Supabase. Los hooks de React consumen esta interfaz; el
 * adaptador concreto (`adapters/supabase-configuracion-repository.ts`) la
 * implementa con supabase-js. Esto permite sustituirla por un fake en
 * pruebas unitarias sin tocar los hooks ni los componentes.
 */
export interface ConfiguracionRepository {
  obtenerMarca(): Promise<ConfiguracionMarca>
  actualizarMarca(input: ActualizarMarcaInput): Promise<ConfiguracionMarca>
}
