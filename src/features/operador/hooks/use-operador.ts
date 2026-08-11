import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type {
  AdjuntoAvanceInput,
  AvanceResumen,
  RegistrarAvanceInput,
  SolicitudOperador,
} from '@/features/operador/types/operador.types'

const tiposPermitidos = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])

export function useSolicitudesOperador(usuarioId?: string) {
  return useQuery({
    queryKey: ['solicitudes-operador', usuarioId],
    enabled: Boolean(usuarioId),
    queryFn: async () => {
      if (!supabase || !usuarioId) throw new Error('No hay sesión de Operador.')
      const { data, error } = await supabase
        .from('solicitudes')
        .select(
          'id, numero, nombre, detalle, estado, prioridad, cliente:clientes(nombre), tipo:tipos_solicitud(nombre), ruta:rutas(vehiculo_id, vehiculo:vehiculos(placa, tipo), provincia, canton, distrito, otras_senas)',
        )
        .eq('operador_id', usuarioId)
        .in('estado', ['asignada', 'en_atencion', 'en_espera_materiales'])
        .order('creado_en', { ascending: false })
      if (error) throw error
      return data as unknown as SolicitudOperador[]
    },
  })
}

export function useAvancesSolicitud(solicitudId?: string) {
  return useQuery({
    queryKey: ['avances-operador', solicitudId],
    enabled: Boolean(solicitudId),
    queryFn: async () => {
      if (!supabase || !solicitudId) throw new Error('Seleccione una solicitud.')
      const { data, error } = await supabase
        .from('avances')
        .select(
          'id, horas_trabajadas, porcentaje, narrativa, creado_en, vehiculo:vehiculos(placa), solicitud_materiales(cantidad, material:materiales(nombre, unidad_medida)), adjuntos(id, nombre_archivo, tipo)',
        )
        .eq('solicitud_id', solicitudId)
        .order('creado_en', { ascending: false })
      if (error) throw error
      return data as unknown as AvanceResumen[]
    },
  })
}

export function useRegistrarAvance() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ archivos, ...input }: RegistrarAvanceInput) => {
      if (!supabase) throw new Error('Supabase no está configurado.')
      const adjuntos: AdjuntoAvanceInput[] = []
      const rutasSubidas: string[] = []
      try {
        for (const archivo of archivos) {
          if (!tiposPermitidos.has(archivo.type))
            throw new Error(`${archivo.name}: tipo de archivo no permitido.`)
          if (archivo.size > 10 * 1024 * 1024)
            throw new Error(`${archivo.name}: supera el límite de 10 MB.`)
          const id = crypto.randomUUID()
          const nombreSeguro = archivo.name.normalize('NFKD').replace(/[^a-zA-Z0-9._-]/g, '_')
          const ruta_storage = `${input.solicitud_id}/${id}/${nombreSeguro}`
          const { error } = await supabase.storage
            .from('solicitudes-adjuntos')
            .upload(ruta_storage, archivo, { contentType: archivo.type, upsert: false })
          if (error) throw error
          rutasSubidas.push(ruta_storage)
          adjuntos.push({
            id,
            nombre_archivo: archivo.name,
            ruta_storage,
            tipo: archivo.type.startsWith('image/') ? 'imagen' : 'documento',
            mime_type: archivo.type,
            tamano_bytes: archivo.size,
          })
        }

        const { data, error } = await supabase.functions.invoke('registrar-avance', {
          body: { ...input, adjuntos },
        })
        if (error) throw error
        if (data?.error) throw new Error(data.error as string)
        return data as { avance_id: string }
      } catch (error) {
        if (rutasSubidas.length)
          await supabase.storage.from('solicitudes-adjuntos').remove(rutasSubidas)
        throw error
      }
    },
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['solicitudes-operador'] }),
        queryClient.invalidateQueries({ queryKey: ['avances-operador', variables.solicitud_id] }),
        queryClient.invalidateQueries({ queryKey: ['solicitudes-admin'] }),
      ])
    },
  })
}
