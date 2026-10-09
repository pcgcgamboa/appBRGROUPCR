import { createSupabaseDirectorioStaffRepository } from '@/features/usuarios/adapters/supabase-directorio-staff-repository'
import { createSupabaseUsuariosRepository } from '@/features/usuarios/adapters/supabase-usuarios-repository'
import type { DirectorioStaffRepository } from '@/features/usuarios/ports/directorio-staff-repository'
import type { UsuariosRepository } from '@/features/usuarios/ports/usuarios-repository'
import { supabase } from '@/lib/supabase'

/**
 * Instancias por defecto de los repositorios de `usuarios`, cableadas al
 * cliente Supabase de la app. `supabase` puede ser `null` cuando el entorno
 * no tiene configuradas las variables
 * `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`; los adaptadores toleran ese
 * caso método a método, así que construir las instancias aquí no rompe el
 * arranque de la app.
 */
export const usuariosRepository: UsuariosRepository = createSupabaseUsuariosRepository(supabase)

export const directorioStaffRepository: DirectorioStaffRepository =
  createSupabaseDirectorioStaffRepository(supabase)
