import type { StaffDirectorioItem } from '@/features/usuarios/types/usuarios.types'

/**
 * Puerto separado de `UsuariosRepository` a propósito: ese repositorio pasa
 * siempre por la Edge Function `admin-users` (gestión privilegiada, solo
 * administradores). Este es una lectura simple, autorizada enteramente por
 * la política RLS `usuarios_lectura_directorio_staff` (cualquier miembro del
 * staff puede ver a los demás), consultada directo desde el adaptador sin
 * pasar por ninguna función privilegiada — ver la matriz de decisión en
 * CLAUDE.md.
 */
export interface DirectorioStaffRepository {
  listar(): Promise<StaffDirectorioItem[]>
}
