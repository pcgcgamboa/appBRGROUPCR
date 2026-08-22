export type RolCodigo = 'administrador' | 'encargado' | 'operador' | 'cliente' | 'solicitante'

export interface PerfilActual {
  id: string
  nombre_completo: string
  cliente_id: string | null
  roles: string[]
}

export interface PerfilRespuesta {
  id: string
  nombre_completo: string
  cliente_id: string | null
  usuario_roles: { roles: { codigo: string } | null }[]
}
