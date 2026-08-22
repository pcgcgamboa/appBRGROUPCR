import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
export interface EditarSolicitudInput {
  solicitud_id: string
  nombre: string
  detalle: string
  cliente_id: string
  ubicacion_id: string
  tipo_solicitud_id: string
  prioridad: 'baja' | 'media' | 'alta' | 'urgente' | null
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

export function useEditarSolicitud() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: EditarSolicitudInput) => {
      if (!supabase) throw new Error('Supabase no está configurado.')

      for (const archivo of input.archivos) {
        if (!tiposPermitidos.has(tipoArchivo(archivo)))
          throw new Error(`El tipo de archivo ${archivo.name} no está permitido.`)
        if (archivo.size > 10 * 1024 * 1024)
          throw new Error(`${archivo.name} supera el límite de 10 MB.`)
      }

      const { error } = await supabase.rpc('editar_datos_solicitud', {
        p_solicitud_id: input.solicitud_id,
        p_nombre: input.nombre,
        p_detalle: input.detalle,
        p_cliente_id: input.cliente_id,
        p_ubicacion_id: input.ubicacion_id,
        p_tipo_solicitud_id: input.tipo_solicitud_id,
        p_prioridad: input.prioridad,
      })
      if (error) throw error

      if (!input.archivos.length) return

      const { data: authData, error: authError } = await supabase.auth.getUser()
      if (authError || !authData.user)
        throw new Error(
          'Los datos se guardaron, pero no fue posible identificar al usuario para adjuntar archivos.',
        )

      for (const archivo of input.archivos) {
        const mimeType = tipoArchivo(archivo)
        const adjuntoId = crypto.randomUUID()
        const nombreSeguro = archivo.name.normalize('NFKD').replace(/[^a-zA-Z0-9._-]/g, '_')
        const ruta = `${input.solicitud_id}/${adjuntoId}/${nombreSeguro}`
        const { error: uploadError } = await supabase.storage
          .from('solicitudes-adjuntos')
          .upload(ruta, archivo, { contentType: mimeType, upsert: false })
        if (uploadError)
          throw new Error(
            `Los datos se guardaron, pero falló el adjunto ${archivo.name}: ${uploadError.message}`,
          )

        const { error: metadataError } = await supabase.from('adjuntos').insert({
          id: adjuntoId,
          solicitud_id: input.solicitud_id,
          subido_por: authData.user.id,
          nombre_archivo: archivo.name,
          ruta_storage: ruta,
          tipo: mimeType.startsWith('image/') ? 'imagen' : 'documento',
          mime_type: mimeType,
          tamano_bytes: archivo.size,
        })
        if (metadataError) {
          await supabase.storage.from('solicitudes-adjuntos').remove([ruta])
          throw new Error(`Los datos se guardaron, pero no se registró el adjunto ${archivo.name}.`)
        }
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['solicitudes-admin'] }),
  })
}
