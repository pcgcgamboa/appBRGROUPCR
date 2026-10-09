export type RolStaff = 'administrador' | 'encargado' | 'operador'

export interface StaffDirectorioItem {
  id: string
  nombre_completo: string
  roles: RolStaff[]
}

export interface UsuarioAdmin {
  id: string
  cuenta: string
  correo: string | null
  nombre_completo: string
  telefono: string | null
  cliente_id: string | null
  costo_hora: number
  activo: boolean
  usuario_roles: { rol_id: number }[]
}

export interface DatosUsuarioAdmin {
  id?: string
  cuenta: string
  correo: string | null
  password?: string
  nombre_completo: string
  telefono: string | null
  cliente_id: string | null
  costo_hora: number
  activo: boolean
  roles: number[]
}
