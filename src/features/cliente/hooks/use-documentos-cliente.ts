import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { clienteRepository } from '@/features/cliente/lib/repository'
import type { SubirDocumentoInput } from '@/features/cliente/ports/cliente-repository'
import type { DocumentoCliente } from '@/features/cliente/types/cliente.types'

export function useDocumentosCliente(clienteId: string) {
  return useQuery({
    queryKey: ['documentos-cliente', clienteId],
    queryFn: () => clienteRepository.documentos(clienteId),
  })
}

export function useGestionDocumentosCliente() {
  const qc = useQueryClient()
  const subir = useMutation({
    mutationFn: (input: SubirDocumentoInput) => clienteRepository.subirDocumento(input),
    onSuccess: (clienteId) => qc.invalidateQueries({ queryKey: ['documentos-cliente', clienteId] }),
  })
  const eliminar = useMutation({
    mutationFn: (documento: DocumentoCliente) => clienteRepository.eliminarDocumento(documento),
    onSuccess: (clienteId) => qc.invalidateQueries({ queryKey: ['documentos-cliente', clienteId] }),
  })
  return { subir, eliminar }
}
