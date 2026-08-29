import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  ActualizarMarcaInput,
  ConfiguracionRepository,
} from '@/features/configuracion/ports/configuracion-repository'
import type { ConfiguracionMarca } from '@/features/configuracion/types/configuracion.types'
import { marcaPredeterminada } from '@/features/configuracion/types/configuracion.types'

/**
 * Adaptador concreto de `ConfiguracionRepository` sobre supabase-js. Cada
 * mÃ©todo verifica que el cliente estÃ© configurado (`client` puede ser
 * `null` cuando las variables de entorno de Supabase no estÃ¡n presentes)
 * para no romper el arranque de la app â€” el chequeo se hace por mÃ©todo, no
 * al construir la instancia, replicando el patrÃ³n `if (!supabase) ...` que
 * ya usaba el hook.
 */
export function createSupabaseConfiguracionRepository(
  client: SupabaseClient | null,
): ConfiguracionRepository {
  return {
    async obtenerOperativa() {
      if (!client) return { garantia_dias: 30 }
      const { data, error } = await client
        .from('configuracion_operativa')
        .select('garantia_dias')
        .eq('id', true)
        .single()
      if (error) throw error
      return data
    },

    async actualizarGarantia(dias: number) {
      if (!client) throw new Error('Supabase no está configurado.')
      const { data } = await client.auth.getUser()
      if (!data.user) throw new Error('Sesión no válida.')
      const { error } = await client
        .from('configuracion_operativa')
        .update({
          garantia_dias: dias,
          actualizado_por: data.user.id,
          actualizado_en: new Date().toISOString(),
        })
        .eq('id', true)
      if (error) throw error
    },
    async obtenerMarca(): Promise<ConfiguracionMarca> {
      if (!client) return marcaPredeterminada
      const { data, error } = await client
        .from('configuracion_marca')
        .select('logo_url, icono_url')
        .eq('id', true)
        .single()
      if (error) throw error
      return data as ConfiguracionMarca
    },

    async actualizarMarca({
      actual,
      logo,
      icono,
    }: ActualizarMarcaInput): Promise<ConfiguracionMarca> {
      if (!client) throw new Error('Supabase no estÃ¡ configurado.')
      const supabaseClient = client
      const { data: sesion } = await supabaseClient.auth.getSession()
      const usuarioId = sesion.session?.user.id
      if (!usuarioId) throw new Error('La sesiÃ³n no es vÃ¡lida.')

      const version = Date.now()
      const siguiente = { ...actual }

      async function subir(archivo: File, nombre: 'logo' | 'icono') {
        const extension = archivo.name.split('.').pop()?.toLowerCase() || 'png'
        const ruta = `${nombre}.${extension}`
        const { error } = await supabaseClient.storage.from('marca').upload(ruta, archivo, {
          upsert: true,
          contentType: archivo.type,
          cacheControl: '3600',
        })
        if (error) throw error
        const { data } = supabaseClient.storage.from('marca').getPublicUrl(ruta)
        return `${data.publicUrl}?v=${version}`
      }

      if (logo) siguiente.logo_url = await subir(logo, 'logo')
      if (icono) siguiente.icono_url = await subir(icono, 'icono')

      const { error } = await supabaseClient
        .from('configuracion_marca')
        .update({
          ...siguiente,
          actualizado_por: usuarioId,
          actualizado_en: new Date().toISOString(),
        })
        .eq('id', true)
      if (error) throw error
      return siguiente
    },
  }
}
