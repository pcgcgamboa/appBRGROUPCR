import type { DatosUsuarioAdmin, UsuarioAdmin } from '@/features/usuarios/types/usuarios.types'

export interface CambiarClaveInput {
  id: string
  password: string
}

/**
 * Puerto del dominio `usuarios`: define el contrato de acceso a datos sin
 * atarse a Supabase. Los hooks de React consumen esta interfaz; el adaptador
 * concreto (`adapters/supabase-usuarios-repository.ts`) la implementa con
 * supabase-js (a través de la Edge Function `admin-users`, la única que usa
 * la `service_role` key para gestión de usuarios). Esto permite sustituirla
 * por un fake en pruebas unitarias sin tocar los hooks ni los componentes.
 */
export interface UsuariosRepository {
  listar(): Promise<UsuarioAdmin[]>
  guardar(usuario: DatosUsuarioAdmin): Promise<void>
  eliminar(id: string): Promise<void>
  cambiarClave(input: CambiarClaveInput): Promise<void>
}
