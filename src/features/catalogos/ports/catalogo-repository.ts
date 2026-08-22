import type { DatosFormulario, EntidadBase } from '@/features/catalogos/types/catalogos.types'

/**
 * Puerto del dominio `catalogos`: define el contrato de acceso a datos sin
 * atarse a Supabase. `useCatalogo` es genérico sobre la tabla consultada (se
 * usa para materiales, tipos de solicitud, vehículos, técnicos, etc.), así
 * que el puerto refleja esa genericidad recibiendo el nombre de tabla como
 * parámetro en vez de exponer un método por entidad. El adaptador concreto
 * (`adapters/supabase-catalogo-repository.ts`) lo implementa con
 * supabase-js. Esto permite sustituirlo por un fake en pruebas unitarias sin
 * tocar los hooks ni los componentes.
 */
export interface CatalogoRepository {
  listar<T extends EntidadBase>(tabla: string): Promise<T[]>
  guardar(
    tabla: string,
    id: string | number | undefined,
    values: DatosFormulario,
  ): Promise<string | number>
  eliminar(tabla: string, id: string | number): Promise<void>
}
