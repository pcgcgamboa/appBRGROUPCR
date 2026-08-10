export interface UsuarioAdmin {
  id: string
  email: string
  nombre_completo: string
  telefono: string | null
  cliente_id: string | null
  activo: boolean
  usuario_roles: { rol_id: number }[]
}

export interface DatosUsuarioAdmin {
  id?: string
  email: string
  password?: string
  nombre_completo: string
  telefono: string | null
  cliente_id: string | null
  activo: boolean
  roles: number[]
}
