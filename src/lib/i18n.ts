import { useEffect } from 'react'
import { useUiStore, type Idioma } from '@/stores/ui.store'

const mensajes = {
  es: {
    appName: 'Solicitudes de servicio',
    language: 'Idioma',
    spanish: 'Español',
    english: 'English',
    administration: 'Administración',
    requests: 'Solicitudes',
    routeControl: 'Control de ruta',
    notifications: 'Notificaciones',
    reports: 'Reportes',
    clients: 'Clientes',
    locations: 'Ubicaciones',
    types: 'Tipos',
    materials: 'Materiales',
    vehicles: 'Vehículos',
    users: 'Usuarios',
    roles: 'Roles',
    signOut: 'Cerrar sesión',
    activeSession: 'Sesión activa',
    signIn: 'Iniciar sesión',
    signingIn: 'Ingresando…',
    enter: 'Ingresar',
    email: 'Correo electrónico',
    password: 'Contraseña',
    loginHelp: 'Use su cuenta registrada en Supabase Auth.',
    invalidCredentials: 'No fue posible iniciar sesión. Verifique sus credenciales.',
    usersDescription: 'Cuentas de acceso, relación con clientes y asignación multirrol.',
    name: 'Nombre',
    fullName: 'Nombre completo',
    initialPassword: 'Contraseña inicial',
    phone: 'Teléfono',
    relatedClient: 'Cliente relacionado',
    activeUser: 'Usuario activo',
    save: 'Guardar',
    saving: 'Guardando…',
    cancel: 'Cancelar',
    edit: 'Editar',
    delete: 'Eliminar',
    loading: 'Cargando…',
    yes: 'Sí',
    no: 'No',
    select: 'Seleccione…',
    noRecords: 'No hay registros.',
    userExists: 'Ya existe un usuario registrado con esta dirección de correo electrónico.',
    deleteUserConfirm: '¿Eliminar definitivamente esta cuenta de autenticación?',
    newUser: 'Nuevo usuario',
    editUser: 'Editar usuario',
    noClient: 'Sin cliente',
    actions: 'Acciones',
    active: 'Activo',
  },
  en: {
    appName: 'Service requests',
    language: 'Language',
    spanish: 'Español',
    english: 'English',
    administration: 'Administration',
    requests: 'Requests',
    routeControl: 'Route control',
    notifications: 'Notifications',
    reports: 'Reports',
    clients: 'Clients',
    locations: 'Locations',
    types: 'Types',
    materials: 'Materials',
    vehicles: 'Vehicles',
    users: 'Users',
    roles: 'Roles',
    signOut: 'Sign out',
    activeSession: 'Active session',
    signIn: 'Sign in',
    signingIn: 'Signing in…',
    enter: 'Sign in',
    email: 'Email address',
    password: 'Password',
    loginHelp: 'Use your account registered in Supabase Auth.',
    invalidCredentials: 'Unable to sign in. Check your credentials.',
    usersDescription: 'Access accounts, client relationships, and multiple role assignments.',
    name: 'Name',
    fullName: 'Full name',
    initialPassword: 'Initial password',
    phone: 'Phone',
    relatedClient: 'Related client',
    activeUser: 'Active user',
    save: 'Save',
    saving: 'Saving…',
    cancel: 'Cancel',
    edit: 'Edit',
    delete: 'Delete',
    loading: 'Loading…',
    yes: 'Yes',
    no: 'No',
    select: 'Select…',
    noRecords: 'No records found.',
    userExists: 'A user with this email address has already been registered.',
    deleteUserConfirm: 'Permanently delete this authentication account?',
    newUser: 'New user',
    editUser: 'Edit user',
    noClient: 'No client',
    actions: 'Actions',
    active: 'Active',
  },
} as const

export type ClaveTraduccion = keyof (typeof mensajes)['es']

export function traducir(clave: ClaveTraduccion, idioma: Idioma) {
  return mensajes[idioma][clave]
}

export function useI18n() {
  const idioma = useUiStore((state) => state.idioma)
  const cambiarIdioma = useUiStore((state) => state.cambiarIdioma)

  useEffect(() => {
    document.documentElement.lang = idioma
  }, [idioma])

  return {
    idioma,
    cambiarIdioma,
    t: (clave: ClaveTraduccion) => traducir(clave, idioma),
  }
}

const erroresConocidos: Array<{ patron: RegExp; clave: ClaveTraduccion }> = [
  {
    patron: /a user with this email address has already been registered|user already registered/i,
    clave: 'userExists',
  },
]

export function traducirError(mensaje: string, idioma = useUiStore.getState().idioma) {
  const conocido = erroresConocidos.find(({ patron }) => patron.test(mensaje))
  return conocido ? traducir(conocido.clave, idioma) : mensaje
}
