import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4'
import { corsHeaders } from '../_shared/cors.ts'
import { notificarEnSegundoPlano } from '../_shared/notificaciones.ts'

type Prioridad = 'baja' | 'media' | 'alta' | 'urgente'
type Estado =
  | 'creada'
  | 'asignada'
  | 'en_atencion'
  | 'en_espera_materiales'
  | 'atendida'
  | 'cerrada'
  | 'cancelada'
  | 'rechazada'

interface Peticion {
  accion: 'asignar' | 'cambiar_estado' | 'rechazar' | 'reabrir'
  solicitud_id: string
  prioridad?: Prioridad
  operador_id?: string
  estado?: Estado
  motivo?: string
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  // Identificador único por solicitud, incluido en toda respuesta (éxito o error) para poder
  // correlacionar un reporte de usuario/soporte con esta invocación puntual de la función.
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
    const authorization = request.headers.get('Authorization') ?? ''
    const caller = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
    })
    const { data: esGestor, error: roleError } = await caller.rpc('es_gestor')
    if (roleError || !esGestor) return respuesta({ error: 'Acceso denegado.' }, 403)

    const payload = (await request.json()) as Peticion
    if (!payload.solicitud_id) return respuesta({ error: 'La solicitud es requerida.' }, 400)
    const { data: solicitud, error: solicitudError } = await caller
      .from('solicitudes')
      .select('id, estado, creado_en, tipo_solicitud_id, operador_id, prioridad')
      .eq('id', payload.solicitud_id)
      .single()
    if (solicitudError) throw solicitudError

    if (payload.accion === 'asignar') {
      if (!payload.prioridad || !payload.operador_id)
        return respuesta({ error: 'Prioridad y operador son obligatorios.' }, 400)
      if (
        !['creada', 'asignada', 'en_atencion', 'en_espera_materiales', 'atendida'].includes(
          solicitud.estado,
        )
      )
        return respuesta({ error: 'La solicitud no admite reasignación en su estado actual.' }, 409)
      const { data: operadorValido } = await caller
        .from('usuario_roles')
        .select(
          'rol:roles!inner(codigo), usuario:usuarios!usuario_roles_usuario_id_fkey!inner(activo)',
        )
        .eq('usuario_id', payload.operador_id)
        .eq('rol.codigo', 'operador')
        .eq('usuario.activo', true)
        .maybeSingle()
      if (!operadorValido)
        return respuesta({ error: 'El usuario seleccionado no es un operador activo.' }, 400)
      const { data: sla, error: slaError } = await caller
        .from('tipo_solicitud_sla')
        .select('horas')
        .eq('tipo_solicitud_id', solicitud.tipo_solicitud_id)
        .eq('prioridad', payload.prioridad)
        .single()
      if (slaError) throw slaError
      const horas = payload.prioridad === 'urgente' ? Math.min(sla.horas, 24) : sla.horas
      const vence = new Date(
        new Date(solicitud.creado_en).getTime() + horas * 3_600_000,
      ).toISOString()
      const { error } = await caller
        .from('solicitudes')
        .update({
          operador_id: payload.operador_id,
          prioridad: payload.prioridad,
          sla_horas: horas,
          sla_vence_en: vence,
          estado: solicitud.estado === 'creada' ? 'asignada' : solicitud.estado,
          motivo_rechazo_cancelacion: null,
        })
        .eq('id', payload.solicitud_id)
      if (error) throw error
      if (solicitud.operador_id && solicitud.operador_id !== payload.operador_id) {
        await caller
          .from('ruta_operarios')
          .delete()
          .eq('solicitud_id', payload.solicitud_id)
          .eq('operario_id', solicitud.operador_id)
        const { data: ruta } = await caller
          .from('rutas')
          .select('solicitud_id')
          .eq('solicitud_id', payload.solicitud_id)
          .maybeSingle()
        if (ruta)
          await caller.from('ruta_operarios').upsert({
            solicitud_id: payload.solicitud_id,
            operario_id: payload.operador_id,
            estado: 'disponible',
          })
      }
      // El registro `pendiente` se inserta antes de responder; el envío SMTP se despacha en
      // segundo plano y no bloquea la respuesta HTTP.
      if (solicitud.estado !== 'asignada')
        await notificarEnSegundoPlano(payload.solicitud_id, 'asignada')
      return respuesta({
        solicitud_id: payload.solicitud_id,
        sla_horas: horas,
        sla_vence_en: vence,
      })
    }

    if (payload.accion === 'rechazar') {
      if (solicitud.estado !== 'creada' || !payload.motivo?.trim())
        return respuesta(
          { error: 'Solo una solicitud creada puede rechazarse y requiere motivo.' },
          400,
        )
      const { error } = await caller
        .from('solicitudes')
        .update({ estado: 'rechazada', motivo_rechazo_cancelacion: payload.motivo.trim() })
        .eq('id', payload.solicitud_id)
      if (error) throw error
      // El registro `pendiente` se inserta antes de responder; el envío SMTP es en segundo plano.
      await notificarEnSegundoPlano(payload.solicitud_id, 'rechazada')
      return respuesta({ solicitud_id: payload.solicitud_id })
    }

    if (payload.accion === 'reabrir') {
      if (solicitud.estado !== 'cerrada' || !solicitud.operador_id || !solicitud.prioridad)
        return respuesta(
          { error: 'La solicitud cerrada debe conservar operador y prioridad para reabrirse.' },
          400,
        )
      const { error } = await caller
        .from('solicitudes')
        .update({ estado: 'asignada' })
        .eq('id', payload.solicitud_id)
      if (error) throw error
      // El registro `pendiente` se inserta antes de responder; el envío SMTP es en segundo plano.
      await notificarEnSegundoPlano(payload.solicitud_id, 'asignada')
      return respuesta({ solicitud_id: payload.solicitud_id })
    }

    if (payload.accion === 'cambiar_estado') {
      if (!payload.estado) return respuesta({ error: 'El nuevo estado es requerido.' }, 400)
      if (
        (payload.estado === 'cancelada' || payload.estado === 'rechazada') &&
        !payload.motivo?.trim()
      )
        return respuesta({ error: 'El motivo es obligatorio.' }, 400)
      const { error } = await caller
        .from('solicitudes')
        .update({
          estado: payload.estado,
          motivo_rechazo_cancelacion: payload.motivo?.trim() || null,
        })
        .eq('id', payload.solicitud_id)
      if (error) throw error
      // El registro `pendiente` se inserta antes de responder; el envío SMTP es en segundo plano.
      if (payload.estado !== solicitud.estado)
        await notificarEnSegundoPlano(payload.solicitud_id, payload.estado)
      return respuesta({ solicitud_id: payload.solicitud_id })
    }

    return respuesta({ error: 'Acción desconocida.' }, 400)
  } catch (error) {
    return respuesta({ error: error instanceof Error ? error.message : 'Error inesperado.' }, 500)
  }
})
