import type { GuardarProformaInput, Proforma } from '@/features/proformas/types/proformas.types'
export interface ProformasRepository {
  listar(solicitudId: string): Promise<Proforma[]>
  generar(solicitudId: string): Promise<string>
  guardar(input: GuardarProformaInput): Promise<void>
  enviar(id: string): Promise<void>
}
