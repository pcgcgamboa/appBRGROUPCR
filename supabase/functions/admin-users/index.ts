import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4'
import { corsHeaders } from '../_shared/cors.ts'

interface SolicitudAdmin {
  accion: 'listar' | 'crear' | 'actualizar' | 'eliminar'
  usuario?: {
    id?: string
    email?: string
    password?: string
    nombre_completo?: string
    telefono?: string | null
    cliente_id?: string | null
    activo?: boolean
    roles?: number[]
  }
}

function respuesta(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return respuesta({ error: 'Método no permitido.' }, 405)

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const authorization = request.headers.get('Authorization') ?? ''
    const caller = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
    })
    const { data: esAdmin, error: roleError } = await caller.rpc('tiene_rol', {
      codigo_rol: 'administrador',
    })
    if (roleError || !esAdmin) return respuesta({ error: 'Acceso denegado.' }, 403)
    const { data: callerData, error: callerError } = await caller.auth.getUser()
    if (callerError || !callerData.user) return respuesta({ error: 'Sesión inválida.' }, 401)

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })
    const payload = (await request.json()) as SolicitudAdmin

    if (payload.accion === 'listar') {
      const [{ data: authData, error: authError }, { data: perfiles, error: perfilesError }] =
        await Promise.all([
          admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
          admin
            .from('usuarios')
            .select(
              'id, nombre_completo, telefono, cliente_id, activo, usuario_roles!usuario_roles_usuario_id_fkey(rol_id)',
            ),
        ])
      if (authError || perfilesError) throw authError ?? perfilesError
      const emails = new Map(authData.users.map((usuario) => [usuario.id, usuario.email]))
      return respuesta({
        usuarios: perfiles.map((perfil) => ({ ...perfil, email: emails.get(perfil.id) ?? '' })),
      })
    }

    const usuario = payload.usuario
    if (!usuario) return respuesta({ error: 'Datos de usuario requeridos.' }, 400)

    if (payload.accion === 'crear') {
      if (!usuario.email || !usuario.password || !usuario.nombre_completo)
        return respuesta({ error: 'Correo, contraseña y nombre son obligatorios.' }, 400)
      const { data, error } = await admin.auth.admin.createUser({
        email: usuario.email,
        password: usuario.password,
        email_confirm: true,
        user_metadata: { nombre_completo: usuario.nombre_completo },
      })
      if (error) throw error
      const id = data.user.id
      const { error: profileError } = await admin
        .from('usuarios')
        .update({
          nombre_completo: usuario.nombre_completo,
          telefono: usuario.telefono,
          cliente_id: usuario.cliente_id,
          activo: true,
        })
        .eq('id', id)
      if (profileError) {
        await admin.auth.admin.deleteUser(id)
        throw profileError
      }
      if (usuario.roles?.length) {
        const { error: rolesError } = await admin
          .from('usuario_roles')
          .insert(usuario.roles.map((rol_id) => ({ usuario_id: id, rol_id })))
        if (rolesError) {
          await admin.auth.admin.deleteUser(id)
          throw rolesError
        }
      }
      return respuesta({ id }, 201)
    }

    if (!usuario.id) return respuesta({ error: 'Identificador requerido.' }, 400)
    if (usuario.id === callerData.user.id)
      return respuesta(
        { error: 'Use otro administrador para modificar o eliminar su propia cuenta.' },
        400,
      )

    if (payload.accion === 'actualizar') {
      if (usuario.email) {
        const { error } = await admin.auth.admin.updateUserById(usuario.id, {
          email: usuario.email,
        })
        if (error) throw error
      }
      const { error: profileError } = await admin
        .from('usuarios')
        .update({
          nombre_completo: usuario.nombre_completo,
          telefono: usuario.telefono,
          cliente_id: usuario.cliente_id,
          activo: usuario.activo,
        })
        .eq('id', usuario.id)
      if (profileError) throw profileError
      const { error: deleteRolesError } = await admin
        .from('usuario_roles')
        .delete()
        .eq('usuario_id', usuario.id)
      if (deleteRolesError) throw deleteRolesError
      if (usuario.roles?.length) {
        const { error: rolesError } = await admin
          .from('usuario_roles')
          .insert(usuario.roles.map((rol_id) => ({ usuario_id: usuario.id!, rol_id })))
        if (rolesError) throw rolesError
      }
      return respuesta({ id: usuario.id })
    }

    if (payload.accion === 'eliminar') {
      const { error } = await admin.auth.admin.deleteUser(usuario.id)
      if (error) throw error
      return respuesta({ id: usuario.id })
    }

    return respuesta({ error: 'Acción desconocida.' }, 400)
  } catch (error) {
    return respuesta({ error: error instanceof Error ? error.message : 'Error inesperado.' }, 500)
  }
})
