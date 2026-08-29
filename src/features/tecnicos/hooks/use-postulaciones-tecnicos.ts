import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { tecnicosRepository } from '@/features/tecnicos/lib/repository'
import type { CrearPostulacionInput } from '@/features/tecnicos/ports/tecnicos-repository'

export function useCrearPostulacionTecnico() {
  return useMutation({
    mutationFn: (input: CrearPostulacionInput) => tecnicosRepository.crearPostulacion(input),
  })
}

export function usePostulacionesPendientes() {
  return useQuery({
    queryKey: ['postulaciones-tecnicos'],
    queryFn: () => tecnicosRepository.listarPostulacionesPendientes(),
  })
}

export function useResolverPostulacion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      aprobar,
      comentario,
    }: {
      id: string
      aprobar: boolean
      comentario: string
    }) => tecnicosRepository.resolverPostulacion(id, aprobar, comentario),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['postulaciones-tecnicos'] }),
        queryClient.invalidateQueries({ queryKey: ['catalogo', 'tecnicos'] }),
      ])
    },
  })
}

export async function abrirDocumentoPostulacion(ruta: string) {
  const url = await tecnicosRepository.obtenerUrlDocumento(ruta)
  window.open(url, '_blank', 'noopener,noreferrer')
}
