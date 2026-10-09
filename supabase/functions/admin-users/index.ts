import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4'
import { corsHeaders } from '../_shared/cors.ts'
import { logError } from '../_shared/logger.ts'

interface SolicitudAdmin {
  accion: 'listar' | 'crear' | 'actualizar' | 'cambiar_clave' | 'eliminar'
  usuario?: {
    id?: string
    cuenta?: string
    correo?: string | null
    password?: string
    nombre_completo?: string
    telefono?: string | null
    cliente_id?: string | null
    activo?: boolean
    costo_hora?: number
    roles?: number[]
  }
}

const cuentaValida = (cuenta: string) => /^[a-z0-9][a-z0-9._-]{2,49}$/.test(cuenta)
const correoValido = (correo: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(correo)

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const correlacionId = crypto.randomUUID()
  function respuesta(body: Record<string, unknown>, status = 200) {
    return new Response(JSON.stringify({ ...body, correlacion_id: correlacionId }), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

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
      const [
        { data: perfiles, error: perfilesError },
        { data: identidades, error: identidadesError },
      ] = await Promise.all([
        admin
          .from('usuarios')
          .select(
            'id,nombre_completo,telefono,cliente_id,costo_hora,activo,usuario_roles!usuario_roles_usuario_id_fkey(rol_id)',
          ),
        admin.from('usuario_cuentas').select('usuario_id,cuenta,correo'),
      ])
      if (perfilesError || identidadesError) throw perfilesError ?? identidadesError
      const porUsuario = new Map(identidades.map((item) => [item.usuario_id, item]))
      return respuesta({
        usuarios: perfiles.map((perfil) => ({
          ...perfil,
          cuenta: porUsuario.get(perfil.id)?.cuenta ?? '',
          correo: porUsuario.get(perfil.id)?.correo ?? null,
        })),
      })
    }

    const usuario = payload.usuario
    if (!usuario) return respuesta({ error: 'Datos de usuario requeridos.' }, 400)
    const cuenta = usuario.cuenta?.trim().toLowerCase() ?? ''
    const correo = usuario.correo?.trim().toLowerCase() || null
    if (payload.accion === 'crear' || payload.accion === 'actualizar') {
      if (!cuentaValida(cuenta))
        return respuesta(
          {
            error:
              'La cuenta debe tener de 3 a 50 caracteres y usar solo letras minúsculas, números, punto, guion o guion bajo.',
          },
          400,
        )
      if (correo && !correoValido(correo))
        return respuesta({ error: 'Correo electrónico inválido.' }, 400)
    }

    if (payload.accion === 'crear') {
      if (!usuario.password || !usuario.nombre_completo)
        return respuesta({ error: 'Cuenta, contraseña y nombre son obligatorios.' }, 400)
      if (usuario.password.length < 8)
        return respuesta({ error: 'La contraseña debe tener al menos 8 caracteres.' }, 400)
      const { data: existente, error: existenteError } = await admin
        .from('usuario_cuentas')
        .select('usuario_id')
        .eq('cuenta', cuenta)
        .maybeSingle()
      if (existenteError) throw existenteError
      if (existente) return respuesta({ error: 'La cuenta indicada ya está en uso.' }, 409)

      const { data, error } = await admin.auth.admin.createUser({
        email: `${crypto.randomUUID()}@accounts.invalid`,
        password: usuario.password,
        email_confirm: true,
        user_metadata: { nombre_completo: usuario.nombre_completo },
      })
      if (error) throw error
      const id = data.user.id
      try {
        const { error: profileError } = await admin
          .from('usuarios')
          .update({
            nombre_completo: usuario.nombre_completo,
            telefono: usuario.telefono,
            cliente_id: usuario.cliente_id,
            activo: true,
            costo_hora: usuario.costo_hora ?? 0,
          })
          .eq('id', id)
        if (profileError) throw profileError
        const { error: identidadError } = await admin
          .from('usuario_cuentas')
          .insert({ usuario_id: id, cuenta, correo })
        if (identidadError) throw identidadError
        if (usuario.roles?.length) {
          const { error: rolesError } = await admin
            .from('usuario_roles')
            .insert(usuario.roles.map((rol_id) => ({ usuario_id: id, rol_id })))
          if (rolesError) throw rolesError
        }
      } catch (errorCreacion) {
        await admin.auth.admin.deleteUser(id)
        throw errorCreacion
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
      const { data: cuentaExistente, error: cuentaError } = await admin
        .from('usuario_cuentas')
        .select('usuario_id')
        .eq('cuenta', cuenta)
        .neq('usuario_id', usuario.id)
        .maybeSingle()
      if (cuentaError) throw cuentaError
      if (cuentaExistente) return respuesta({ error: 'La cuenta indicada ya está en uso.' }, 409)

      const { error: identidadError } = await admin
        .from('usuario_cuentas')
        .upsert({ usuario_id: usuario.id, cuenta, correo })
      if (identidadError) throw identidadError
      const { error: profileError } = await admin
        .from('usuarios')
        .update({
          nombre_completo: usuario.nombre_completo,
          telefono: usuario.telefono,
          cliente_id: usuario.cliente_id,
          activo: usuario.activo,
          costo_hora: usuario.costo_hora ?? 0,
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

    if (payload.accion === 'cambiar_clave') {
      if (!usuario.password || usuario.password.length < 8)
        return respuesta({ error: 'La contraseña debe tener al menos 8 caracteres.' }, 400)
      const { error } = await admin.auth.admin.updateUserById(usuario.id, {
        password: usuario.password,
      })
      if (error) throw error
      return respuesta({ id: usuario.id })
    }

    if (payload.accion === 'eliminar') {
      const { error } = await admin.auth.admin.deleteUser(usuario.id)
      if (error) throw error
      return respuesta({ id: usuario.id })
    }

    return respuesta({ error: 'Acción desconocida.' }, 400)
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : 'Error inesperado.'
    logError(mensaje, { funcion: 'admin-users', correlacion_id: correlacionId })
    return respuesta({ error: mensaje }, 500)
  }
})
