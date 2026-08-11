import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { SolicitudFormData } from '@/features/solicitudes/schemas/solicitud.schema'

interface CrearSolicitudInput extends SolicitudFormData {
  cliente_id: string
  solicitante_id: string
  archivos: File[]
}

const tiposPermitidos = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])

export function useCrearSolicitud() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ archivos, ...values }: CrearSolicitudInput) => {
      if (!supabase) throw new Error('Supabase no está configurado.')
      for (const archivo of archivos) {
        if (!tiposPermitidos.has(archivo.type))
          throw new Error(`El tipo de archivo ${archivo.name} no está permitido.`)
        if (archivo.size > 10 * 1024 * 1024)
          throw new Error(`${archivo.name} supera el límite de 10 MB.`)
      }
      const { data: solicitud, error } = await supabase
        .from('solicitudes')
        .insert(values)
        .select('id, numero')
        .single()
      if (error) throw error

      for (const archivo of archivos) {
        const adjuntoId = crypto.randomUUID()
        const nombreSeguro = archivo.name.normalize('NFKD').replace(/[^a-zA-Z0-9._-]/g, '_')
        const ruta = `${solicitud.id}/${adjuntoId}/${nombreSeguro}`
        const { error: uploadError } = await supabase.storage
          .from('solicitudes-adjuntos')
          .upload(ruta, archivo, { contentType: archivo.type, upsert: false })
        if (uploadError)
          throw new Error(
            `Solicitud #${solicitud.numero} creada, pero falló el adjunto ${archivo.name}: ${uploadError.message}`,
          )
        const { error: metadataError } = await supabase.from('adjuntos').insert({
          id: adjuntoId,
          solicitud_id: solicitud.id,
          subido_por: values.solicitante_id,
          nombre_archivo: archivo.name,
          ruta_storage: ruta,
          tipo: archivo.type.startsWith('image/') ? 'imagen' : 'documento',
          mime_type: archivo.type,
          tamano_bytes: archivo.size,
        })
        if (metadataError) {
          await supabase.storage.from('solicitudes-adjuntos').remove([ruta])
          throw new Error(
            `Solicitud #${solicitud.numero} creada, pero no se registró el adjunto ${archivo.name}.`,
          )
        }
      }
      return solicitud
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mis-solicitudes'] }),
  })
}
