import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export type Comunicacion = {
  id: string
  solicitud_id: string
  tipo: 'mensaje' | 'proforma'
  asunto: string
  mensaje: string
  monto: number | null
  creado_en: string
  remitente: { nombre_completo: string } | null
  adjuntos: {
    id: string
    nombre_archivo: string
    ruta_storage: string
    mime_type: string
    url?: string
  }[]
}

export function useComunicacionesSolicitud(solicitudId?: string) {
  return useQuery({
    queryKey: ['comunicaciones-solicitud', solicitudId],
    enabled: Boolean(solicitudId),
    queryFn: async () => {
      if (!supabase || !solicitudId) return []
      const { data, error } = await supabase
        .from('solicitud_comunicaciones')
        .select(
          'id,solicitud_id,tipo,asunto,mensaje,monto,creado_en,remitente:usuarios!solicitud_comunicaciones_enviado_por_fkey(nombre_completo),adjuntos:solicitud_comunicacion_adjuntos(id,nombre_archivo,ruta_storage,mime_type)',
        )
        .eq('solicitud_id', solicitudId)
        .order('creado_en', { ascending: false })
      if (error) throw error
      const comunicaciones = data as unknown as Comunicacion[]
      return Promise.all(
        comunicaciones.map(async (item) => ({
          ...item,
          adjuntos: await Promise.all(
            item.adjuntos.map(async (adjunto) => {
              const { data: enlace } = await supabase!.storage
                .from('solicitudes-adjuntos')
                .createSignedUrl(adjunto.ruta_storage, 3600)
              return { ...adjunto, url: enlace?.signedUrl }
            }),
          ),
        })),
      )
    },
  })
}

export function useEnviarComunicacion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      solicitudId: string
      tipo: 'mensaje' | 'proforma'
      asunto: string
      mensaje: string
      monto: number | null
      archivos: File[]
    }) => {
      if (!supabase) throw new Error('Supabase no está configurado.')
      const { data: auth, error: authError } = await supabase.auth.getUser()
      if (authError || !auth.user) throw new Error('La sesión no es válida.')
      const { data: comunicacion, error } = await supabase
        .from('solicitud_comunicaciones')
        .insert({
          solicitud_id: input.solicitudId,
          tipo: input.tipo,
          asunto: input.asunto.trim(),
          mensaje: input.mensaje.trim(),
          monto: input.tipo === 'proforma' ? input.monto : null,
          enviado_por: auth.user.id,
        })
        .select('id')
        .single()
      if (error) throw error
      for (const archivo of input.archivos) {
        const id = crypto.randomUUID()
        const nombre = archivo.name.replace(/[^a-zA-Z0-9._-]/g, '_')
        const ruta = `${input.solicitudId}/comunicaciones/${comunicacion.id}/${id}-${nombre}`
        const subida = await supabase.storage.from('solicitudes-adjuntos').upload(ruta, archivo)
        if (subida.error) throw subida.error
        const registro = await supabase.from('solicitud_comunicacion_adjuntos').insert({
          id,
          comunicacion_id: comunicacion.id,
          solicitud_id: input.solicitudId,
          nombre_archivo: archivo.name,
          ruta_storage: ruta,
          mime_type: archivo.type,
          tamano_bytes: archivo.size,
        })
        if (registro.error) {
          await supabase.storage.from('solicitudes-adjuntos').remove([ruta])
          throw registro.error
        }
      }
      return input.solicitudId
    },
    onSuccess: (solicitudId) =>
      Promise.all([
        qc.invalidateQueries({ queryKey: ['comunicaciones-solicitud', solicitudId] }),
        qc.invalidateQueries({ queryKey: ['tracking-solicitud', solicitudId] }),
        qc.invalidateQueries({ queryKey: ['tracking-cliente'] }),
      ]),
  })
}
