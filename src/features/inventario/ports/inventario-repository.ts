import type {
  AsignacionHerramienta,
  AsignarHerramientaInput,
  DevolverHerramientaInput,
  HerramientaResumen,
  PersonaInventario,
} from '@/features/inventario/types/inventario.types'
export interface InventarioRepository {
  herramientas(): Promise<HerramientaResumen[]>
  personas(): Promise<PersonaInventario[]>
  asignaciones(): Promise<AsignacionHerramienta[]>
  asignar(input: AsignarHerramientaInput): Promise<void>
  devolver(input: DevolverHerramientaInput): Promise<void>
}
