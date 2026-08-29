import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { proformasRepository } from '@/features/proformas/lib/repository'
import type { GuardarProformaInput } from '@/features/proformas/types/proformas.types'
export function useProformas(solicitudId: string) {
  return useQuery({
    queryKey: ['proformas', solicitudId],
    queryFn: () => proformasRepository.listar(solicitudId),
  })
}
export function useGestionProformas(solicitudId: string) {
  const qc = useQueryClient()
  const invalidar = () => {
    void qc.invalidateQueries({ queryKey: ['proformas', solicitudId] })
    void qc.invalidateQueries({ queryKey: ['comunicaciones-solicitud', solicitudId] })
    void qc.invalidateQueries({ queryKey: ['tracking-solicitud', solicitudId] })
    void qc.invalidateQueries({ queryKey: ['tracking-cliente'] })
  }
  return {
    generar: useMutation({
      mutationFn: () => proformasRepository.generar(solicitudId),
      onSuccess: invalidar,
    }),
    guardar: useMutation({
      mutationFn: (input: GuardarProformaInput) => proformasRepository.guardar(input),
      onSuccess: invalidar,
    }),
    enviar: useMutation({
      mutationFn: (id: string) => proformasRepository.enviar(id),
      onSuccess: invalidar,
    }),
  }
}
