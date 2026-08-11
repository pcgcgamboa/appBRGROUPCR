import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { SolicitudFormData } from '@/features/solicitudes/schemas/solicitud.schema'

interface CrearSolicitudInput extends SolicitudFormData {
  cliente_id: string
  solicitante_id: string
  archivos: File[]
}

const tiposPermitidos = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])

function tipoArchivo(archivo: File) {
  if (archivo.type) return archivo.type
  const extension = archivo.name.split('.').pop()?.toLowerCase()
  if (extension === 'jpg' || extension === 'jpeg' || extension === 'jfif') return 'image/jpeg'
  if (extension === 'png') return 'image/png'
  if (extension === 'webp') return 'image/webp'
  if (extension === 'pdf') return 'application/pdf'
  return ''
}

export function useCrearSolicitud() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ archivos, ...values }: CrearSolicitudInput) => {
      if (!supabase) throw new Error('Supabase no está configurado.')
      for (const archivo of archivos) {
        if (!tiposPermitidos.has(tipoArchivo(archivo)))
          throw new Error(`El tipo de archivo ${archivo.name} no está permitido.`)
        if (archivo.size > 10 * 1024 * 1024)
          throw new Error(`${archivo.name} supera el límite de 10 MB.`)
      }
      const { data, error } = await supabase.rpc('crear_solicitud_portal', {
        p_nombre: values.nombre,
        p_tipo_solicitud_id: values.tipo_solicitud_id,
        p_ubicacion_id: values.ubicacion_id,
        p_detalle: values.detalle,
      })
      if (error) throw error
      const solicitud = data as { id: string; numero: number }

      for (const archivo of archivos) {
        const mimeType = tipoArchivo(archivo)
        const adjuntoId = crypto.randomUUID()
        const nombreSeguro = archivo.name.normalize('NFKD').replace(/[^a-zA-Z0-9._-]/g, '_')
        const ruta = `${solicitud.id}/${adjuntoId}/${nombreSeguro}`
        const { error: uploadError } = await supabase.storage
          .from('solicitudes-adjuntos')
          .upload(ruta, archivo, { contentType: mimeType, upsert: false })
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
          tipo: mimeType.startsWith('image/') ? 'imagen' : 'documento',
          mime_type: mimeType,
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
