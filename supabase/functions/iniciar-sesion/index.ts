import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4'
import { corsHeaders } from '../_shared/cors.ts'
import { logError } from '../_shared/logger.ts'

const respuesta = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return respuesta({ error: 'Método no permitido.' }, 405)

  const correlacionId = crypto.randomUUID()
  const errorCredenciales = () => respuesta({ error: 'Cuenta o contraseña incorrecta.' }, 401)

  try {
    const { cuenta, password } = (await request.json()) as {
      cuenta?: string
      password?: string
    }
    const cuentaNormalizada = cuenta?.trim().toLowerCase() ?? ''
    if (!/^[a-z0-9][a-z0-9._-]{2,49}$/.test(cuentaNormalizada) || !password)
      return errorCredenciales()

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

    const { data: identidad, error: identidadError } = await admin
      .from('usuario_cuentas')
      .select('usuario_id')
      .eq('cuenta', cuentaNormalizada)
      .maybeSingle()
    if (identidadError) throw identidadError
    if (!identidad) return errorCredenciales()

    const { data: perfil, error: perfilError } = await admin
      .from('usuarios')
      .select('activo')
      .eq('id', identidad.usuario_id)
      .maybeSingle()
    if (perfilError) throw perfilError
    if (!perfil?.activo) return errorCredenciales()

    const { data: usuarioAuth, error: usuarioError } = await admin.auth.admin.getUserById(
      identidad.usuario_id,
    )
    const emailInterno = usuarioAuth.user?.email
    if (usuarioError || !emailInterno) return errorCredenciales()

    const autenticacion = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } })
    const { data, error } = await autenticacion.auth.signInWithPassword({
      email: emailInterno,
      password,
    })
    if (error || !data.session) return errorCredenciales()

    return respuesta({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    })
  } catch (error) {
    logError(error instanceof Error ? error.message : 'Error inesperado.', {
      funcion: 'iniciar-sesion',
      correlacion_id: correlacionId,
    })
    return respuesta({ error: 'No fue posible iniciar sesión.' }, 500)
  }
})
