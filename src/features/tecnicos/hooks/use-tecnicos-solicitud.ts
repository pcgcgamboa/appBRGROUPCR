import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { tecnicosRepository } from '@/features/tecnicos/lib/repository'
import type {
  AsignarTecnicosInput,
  TecnicosSolicitud,
} from '@/features/tecnicos/ports/tecnicos-repository'

export function useTecnicosSolicitud(solicitudId: string) {
  return useQuery({
    queryKey: ['tecnicos-solicitud', solicitudId],
    queryFn: () => tecnicosRepository.tecnicosSolicitud(solicitudId),
  })
}

export function useAsignarTecnicos() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: AsignarTecnicosInput) => tecnicosRepository.asignarTecnicos(input),
    // Optimista: la casilla refleja el cambio al instante; si falla se restaura lo guardado.
    onMutate: async ({ solicitudId, tecnicos }) => {
      const queryKey = ['tecnicos-solicitud', solicitudId]
      await qc.cancelQueries({ queryKey })
      const anterior = qc.getQueryData<TecnicosSolicitud>(queryKey)
      if (anterior)
        qc.setQueryData<TecnicosSolicitud>(queryKey, { ...anterior, asignados: tecnicos })
      return { anterior }
    },
    onError: (_error, { solicitudId }, contexto) => {
      if (contexto?.anterior)
        qc.setQueryData(['tecnicos-solicitud', solicitudId], contexto.anterior)
    },
    onSettled: (_, __, v) =>
      qc.invalidateQueries({ queryKey: ['tecnicos-solicitud', v.solicitudId] }),
  })
}
