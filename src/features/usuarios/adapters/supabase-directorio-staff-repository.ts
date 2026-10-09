import type { SupabaseClient } from '@supabase/supabase-js'
import type { DirectorioStaffRepository } from '@/features/usuarios/ports/directorio-staff-repository'
import type { RolStaff, StaffDirectorioItem } from '@/features/usuarios/types/usuarios.types'

interface FilaDirectorio {
  id: string
  nombre_completo: string
  usuario_roles: { roles: { codigo: string } | null }[]
}

export function createSupabaseDirectorioStaffRepository(
  client: SupabaseClient | null,
): DirectorioStaffRepository {
  return {
    async listar(): Promise<StaffDirectorioItem[]> {
      if (!client) throw new Error('Supabase no está configurado.')
      const { data, error } = await client
        .from('usuarios')
        .select('id, nombre_completo, usuario_roles!usuario_roles_usuario_id_fkey(roles(codigo))')
        .order('nombre_completo')
      if (error) throw error
      return (data as unknown as FilaDirectorio[]).map((fila) => ({
        id: fila.id,
        nombre_completo: fila.nombre_completo,
        roles: fila.usuario_roles.flatMap((item) =>
          item.roles?.codigo ? [item.roles.codigo as RolStaff] : [],
        ),
      }))
    },
  }
}
