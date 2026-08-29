import type { SupabaseClient } from '@supabase/supabase-js'
import type { SeguimientoRepository } from '@/features/seguimiento/ports/seguimiento-repository'
import type {
  GarantiaInput,
  SeguimientoSolicitud,
  VisitaInput,
} from '@/features/seguimiento/types/seguimiento.types'

export function createSupabaseSeguimientoRepository(
  client: SupabaseClient | null,
): SeguimientoRepository {
  function requerido() {
    if (!client) throw new Error('Supabase no está configurado.')
    return client
  }
  async function usuarioActual() {
    const { data } = await requerido().auth.getUser()
    if (!data.user) throw new Error('Sesión no válida.')
    return data.user
  }
  return {
    async obtener(solicitudId: string) {
      const supabase = requerido()
      const [solicitud, interacciones, visitas, rutas] = await Promise.all([
        supabase
          .from('solicitudes')
          .select('garantia_inicia_en,garantia_vence_en')
          .eq('id', solicitudId)
          .single(),
        supabase
          .from('solicitud_garantia_interacciones')
          .select(
            'id,tipo,detalle,estado,creado_en,autor:usuarios!solicitud_garantia_interacciones_creado_por_fkey(nombre_completo)',
          )
          .eq('solicitud_id', solicitudId)
          .order('creado_en', { ascending: false }),
        supabase
          .from('solicitud_visitas')
          .select(
            'id,llegada_estimada,indicaciones,creado_en,autor:usuarios!solicitud_visitas_informado_por_fkey(nombre_completo)',
          )
          .eq('solicitud_id', solicitudId)
          .order('llegada_estimada', { ascending: false }),
        supabase
          .from('ruta_solicitudes')
          .select(
            'ruta:rutas_proceso(ruta_participantes(usuario_id,usuario:usuarios(nombre_completo,foto_url)))',
          )
          .eq('solicitud_id', solicitudId),
      ])
      const error = solicitud.error ?? interacciones.error ?? visitas.error ?? rutas.error
      if (error) throw error
      const equipo = (rutas.data ?? []).flatMap((item) => {
        const ruta = item.ruta as unknown as {
          ruta_participantes: SeguimientoSolicitud['equipo']
        } | null
        return ruta?.ruta_participantes ?? []
      })
      const equipoFirmado = await Promise.all(
        equipo.map(async (persona) => {
          const rutaFoto = persona.usuario?.foto_url
          if (!rutaFoto) return persona
          const { data } = await supabase.storage.from('perfiles').createSignedUrl(rutaFoto, 3600)
          return {
            ...persona,
            usuario: persona.usuario
              ? { ...persona.usuario, foto_url: data?.signedUrl ?? null }
              : null,
          }
        }),
      )
      return {
        ...(solicitud.data as Pick<
          SeguimientoSolicitud,
          'garantia_inicia_en' | 'garantia_vence_en'
        >),
        interacciones: interacciones.data ?? [],
        visitas: visitas.data ?? [],
        equipo: equipoFirmado,
      } as unknown as SeguimientoSolicitud
    },
    async agregarGarantia(input: GarantiaInput) {
      const usuario = await usuarioActual()
      const { error } = await requerido().from('solicitud_garantia_interacciones').insert({
        solicitud_id: input.solicitud_id,
        tipo: input.tipo,
        detalle: input.detalle,
        creado_por: usuario.id,
      })
      if (error) throw error
    },
    async programarVisita(input: VisitaInput) {
      const usuario = await usuarioActual()
      const { error } = await requerido()
        .from('solicitud_visitas')
        .insert({
          solicitud_id: input.solicitud_id,
          llegada_estimada: input.llegada_estimada,
          indicaciones: input.indicaciones.trim() || null,
          informado_por: usuario.id,
        })
      if (error) throw error
    },
  }
}
