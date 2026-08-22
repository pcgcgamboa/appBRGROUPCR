/**
 * Roles que participan en la navegación por rutas (segmentos de URL bajo `/`).
 * El orden de este arreglo NO determina prioridad de selección — solo filtra
 * cuáles roles del perfil del usuario son roles "navegables". La prioridad de
 * rol activo por defecto la determina el orden en que el perfil devuelve los
 * roles del usuario (ver `calcularRolesDisponibles`).
 */
export const ROLES_NAVEGABLES = [
  'administrador',
  'encargado',
  'solicitante',
  'operador',
  'cliente',
] as const

export type RolNavegable = (typeof ROLES_NAVEGABLES)[number]

/** Filtra los roles del perfil actual dejando solo los navegables, preservando su orden original. */
export function calcularRolesDisponibles(roles: string[] | undefined): string[] {
  return roles?.filter((rol) => ROLES_NAVEGABLES.includes(rol as RolNavegable)) ?? []
}
