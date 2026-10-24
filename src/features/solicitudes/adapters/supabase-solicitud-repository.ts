import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  AgregarMaterialInput,
  AplicarGarantiaInput,
  CrearSolicitudInput,
  EditarBorradorInput,
  EditarSolicitudInput,
  EnviarComunicacionInput,
  GestionInput,
  Intervencion,
  ResolverPeticionInput,
  SolicitudOriginalDisponible,
  SolicitudRepository,
} from '@/features/solicitudes/ports/solicitud-repository'
import type {
  Comunicacion,
  MaterialSolicitud,
  AdjuntoSolicitud,
  MiSolicitud,
  SolicitudPortalCliente,
  OperadorResumen,
  SolicitudAdmin,
} from '@/features/solicitudes/types/solicitudes.types'
import type { ActividadSolicitud } from '@/features/solicitudes/types/tracking.types'

const tiposPermitidos = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])

function tipoArchivo(archivo: File) {
  if (archivo.type) return archivo.type
  const extension = archivo.name.split('.').pop()?.toLowerCase()
  if (extension === 'jpg' || extension === 'jpeg' || extension === 'jfif') return 'image/jpeg'
  if (extension === 'png') return 'image/png'
  if (extension === 'webp') return 'image/webp'
  if (extension === 'pdf') return 'application/pdf'
  return ''
}

function validarArchivos(archivos: File[]) {
  for (const archivo of archivos) {
    if (!tiposPermitidos.has(tipoArchivo(archivo)))
      throw new Error(`El tipo de archivo ${archivo.name} no está permitido.`)
    if (archivo.size > 10 * 1024 * 1024)
      throw new Error(`${archivo.name} supera el límite de 10 MB.`)
  }
}

/**
 * Sube cada archivo al bucket y registra su fila en `adjuntos`; si el registro falla, retira el
 * archivo subido. `contexto` encabeza los mensajes de error ("Solicitud #12 creada", "Los datos
 * se guardaron"), porque para entonces la operación principal ya se hizo.
 */
async function subirAdjuntos(
  client: SupabaseClient,
  solicitudId: string,
  archivos: File[],
  subidoPor: string,
  contexto: string,
) {
  for (const archivo of archivos) {
    const mimeType = tipoArchivo(archivo)
    const adjuntoId = crypto.randomUUID()
    const nombreSeguro = archivo.name.normalize('NFKD').replace(/[^a-zA-Z0-9._-]/g, '_')
    const ruta = `${solicitudId}/${adjuntoId}/${nombreSeguro}`
    const { error: uploadError } = await client.storage
      .from('solicitudes-adjuntos')
      .upload(ruta, archivo, { contentType: mimeType, upsert: false })
    if (uploadError)
      throw new Error(`${contexto}, pero falló el adjunto ${archivo.name}: ${uploadError.message}`)
    const { error: metadataError } = await client.from('adjuntos').insert({
      id: adjuntoId,
      solicitud_id: solicitudId,
      subido_por: subidoPor,
      nombre_archivo: archivo.name,
      ruta_storage: ruta,
      tipo: mimeType.startsWith('image/') ? 'imagen' : 'documento',
      mime_type: mimeType,
      tamano_bytes: archivo.size,
    })
    if (metadataError) {
      await client.storage.from('solicitudes-adjuntos').remove([ruta])
      throw new Error(`${contexto}, pero no se registró el adjunto ${archivo.name}.`)
    }
  }
}

/**
 * Adaptador concreto de `SolicitudRepository` sobre supabase-js. Cada método
 * verifica que el cliente esté configurado (`client` puede ser `null` cuando
 * las variables de entorno de Supabase no están presentes) para no romper el
 * arranque de la app — el chequeo se hace por método, no al construir la
 * instancia, replicando el patrón `if (!supabase) throw ...` que ya usaban
 * los hooks.
 */
export function createSupabaseSolicitudRepository(
  client: SupabaseClient | null,
): SolicitudRepository {
  return {
    async listarAdmin(): Promise<SolicitudAdmin[]> {
      if (!client) throw new Error('Supabase no está configurado.')
      const { data, error } = await client
        .from('solicitudes')
        .select(
          'id, numero, nombre, detalle, cliente_id, ubicacion_id, prioridad, estado, operador_id, motivo_rechazo_cancelacion, sla_horas, sla_vence_en, creado_en, tipo_solicitud_id, original:solicitud_original_id(numero), equipo:equipos_cliente(nombre, marca, modelo, serie), cliente:clientes(nombre), tipo:tipos_solicitud(nombre), ubicacion:ubicaciones(nombre, provincia, canton, distrito, latitud, longitud), ruta:rutas(latitud, longitud), operador:usuarios!solicitudes_operador_id_fkey(nombre_completo), solicitante:usuarios!solicitudes_solicitante_id_fkey(nombre_completo), validacion:validaciones_cierre(satisfecho, comentario, validado_en), peticiones:solicitud_peticiones_resolucion(id, tipo, motivo, estado, creado_en, comentario_resolucion)',
        )
        .order('creado_en', { ascending: false })
      if (error) throw error
      return data as unknown as SolicitudAdmin[]
    },

    async intervenir({ id, ...values }: Intervencion): Promise<void> {
      if (!client) throw new Error('Supabase no está configurado.')
      const { error } = await client.from('solicitudes').update(values).eq('id', id)
      if (error) throw error
    },

    async enviarSolicitud(solicitudId: string): Promise<void> {
      if (!client) throw new Error('Supabase no está configurado.')
      const { error } = await client.rpc('enviar_solicitud', { p_solicitud_id: solicitudId })
      if (error) throw error
    },

    async editarBorrador(input: EditarBorradorInput): Promise<void> {
      if (!client) throw new Error('Supabase no está configurado.')
      validarArchivos(input.archivos)
      const { error } = await client.rpc('editar_solicitud_borrador', {
        p_solicitud_id: input.id,
        p_nombre: input.nombre,
        p_tipo_solicitud_id: input.tipo_solicitud_id,
        p_ubicacion_id: input.ubicacion_id,
        p_detalle: input.detalle,
        p_equipo_id: input.equipo_id,
      })
      if (error) throw error
      if (!input.archivos.length) return
      const { data: authData, error: authError } = await client.auth.getUser()
      if (authError || !authData.user)
        throw new Error('Los cambios se guardaron, pero no fue posible adjuntar los archivos.')
      await subirAdjuntos(
        client,
        input.id,
        input.archivos,
        authData.user.id,
        'Los cambios se guardaron',
      )
    },

    async ultimaUbicacionEquipo(equipoId: string): Promise<string | null> {
      if (!client) throw new Error('Supabase no está configurado.')
      const { data, error } = await client
        .from('solicitudes')
        .select('ubicacion_id')
        .eq('equipo_id', equipoId)
        .not('ubicacion_id', 'is', null)
        .order('creado_en', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw error
      return (data as { ubicacion_id: string } | null)?.ubicacion_id ?? null
    },

    async adjuntos(solicitudId: string): Promise<AdjuntoSolicitud[]> {
      if (!client) throw new Error('Supabase no está configurado.')
      const { data, error } = await client
        .from('adjuntos')
        .select('id, nombre_archivo, ruta_storage, mime_type, subido_por, creado_en')
        .eq('solicitud_id', solicitudId)
        .order('creado_en', { ascending: true })
      if (error) throw error
      return Promise.all(
        (data as AdjuntoSolicitud[]).map(async (adjunto) => {
          const { data: enlace } = await client.storage
            .from('solicitudes-adjuntos')
            .createSignedUrl(adjunto.ruta_storage, 3600)
          return { ...adjunto, url: enlace?.signedUrl }
        }),
      )
    },

    async eliminarAdjunto(adjunto: AdjuntoSolicitud): Promise<void> {
      if (!client) throw new Error('Supabase no está configurado.')
      // Primero la fila: si RLS no lo permite no hay error, sino 0 filas (se avisa).
      const { data, error } = await client
        .from('adjuntos')
        .delete()
        .eq('id', adjunto.id)
        .select('id')
      if (error) throw error
      if (!data?.length) throw new Error('No tiene permiso para eliminar este adjunto.')
      const { error: storageError } = await client.storage
        .from('solicitudes-adjuntos')
        .remove([adjunto.ruta_storage])
      if (storageError) throw storageError
    },

    async aplicarGarantia({
      solicitud_original_id,
      detalle,
      idempotencia_clave,
    }: AplicarGarantiaInput): Promise<{ id: string; numero: number }> {
      if (!client) throw new Error('Supabase no está configurado.')
      const { data, error } = await client.rpc('aplicar_garantia_solicitud', {
        p_solicitud_original_id: solicitud_original_id,
        p_detalle: detalle,
        p_idempotencia_clave: idempotencia_clave ?? null,
      })
      if (error) throw error
      return data as { id: string; numero: number }
    },

    async crear({
      archivos,
      como_gestor,
      ...values
    }: CrearSolicitudInput): Promise<{ id: string; numero: number }> {
      if (!client) throw new Error('Supabase no está configurado.')
      validarArchivos(archivos)
      const parametros = {
        p_nombre: values.nombre,
        p_tipo_solicitud_id: values.tipo_solicitud_id,
        p_ubicacion_id: values.ubicacion_id,
        p_detalle: values.detalle,
        p_idempotencia_clave: values.idempotencia_clave,
        p_equipo_id: values.equipo_id ?? null,
        p_equipo_nuevo: values.equipo_nuevo ?? null,
        p_solicitud_original_id: values.solicitud_original_id ?? null,
      }
      const { data, error } = como_gestor
        ? await client.rpc('crear_solicitud_gestor', {
            ...parametros,
            p_cliente_id: values.cliente_id,
          })
        : await client.rpc('crear_solicitud_portal', parametros)
      if (error) throw error
      const solicitud = data as { id: string; numero: number }
      await subirAdjuntos(
        client,
        solicitud.id,
        archivos,
        values.solicitante_id,
        `Solicitud #${solicitud.numero} creada`,
      )
      return solicitud
    },

    async editarDatos(input: EditarSolicitudInput): Promise<void> {
      if (!client) throw new Error('Supabase no está configurado.')
      validarArchivos(input.archivos)

      const { error } = await client.rpc('editar_datos_solicitud', {
        p_solicitud_id: input.solicitud_id,
        p_nombre: input.nombre,
        p_detalle: input.detalle,
        p_cliente_id: input.cliente_id,
        p_ubicacion_id: input.ubicacion_id,
        p_tipo_solicitud_id: input.tipo_solicitud_id,
        p_prioridad: input.prioridad,
      })
      if (error) throw error

      if (!input.archivos.length) return

      const { data: authData, error: authError } = await client.auth.getUser()
      if (authError || !authData.user)
        throw new Error(
          'Los datos se guardaron, pero no fue posible identificar al usuario para adjuntar archivos.',
        )

      await subirAdjuntos(
        client,
        input.solicitud_id,
        input.archivos,
        authData.user.id,
        'Los datos se guardaron',
      )
    },

    async misSolicitudes(usuarioId?: string): Promise<MiSolicitud[]> {
      if (!client || !usuarioId) throw new Error('No hay una sesión activa.')
      const { data, error } = await client
        .from('solicitudes')
        .select(
          'id, numero, nombre, detalle, estado, prioridad, creado_en, sla_vence_en, tipo_solicitud_id, ubicacion_id, equipo_id, tipo:tipos_solicitud(nombre), archivo:solicitudes_archivadas(archivada_en)',
        )
        .eq('solicitante_id', usuarioId)
        .order('creado_en', { ascending: false })
      if (error) throw error
      return data as unknown as MiSolicitud[]
    },

    async solicitudesPortalCliente(clienteId: string): Promise<SolicitudPortalCliente[]> {
      if (!client) throw new Error('Supabase no está configurado.')
      const { data, error } = await client
        .from('solicitudes')
        .select(
          'id, numero, nombre, detalle, estado, prioridad, creado_en, sla_vence_en, cerrada_en, tipo_solicitud_id, ubicacion_id, equipo_id, garantia_vence_en, tipo:tipos_solicitud(nombre), operador:usuarios!solicitudes_operador_id_fkey(nombre_completo), ubicacion:ubicaciones(nombre, provincia, canton, distrito, otras_senas), equipo:equipos_cliente(nombre, marca, modelo, serie), original:solicitud_original_id(numero, nombre), garantias:solicitudes!solicitud_original_id(numero, estado), avances(creado_en, reportes_atencion(ruta_storage_pdf, estado_equipo_final, recomendaciones, checklist_requiere_seguimiento, creado_en)), validacion:validaciones_cierre(satisfecho, comentario, calificacion, llego_a_tiempo, recomendaria_tecnico, validado_en), archivo:solicitudes_archivadas(archivada_en)',
        )
        .eq('cliente_id', clienteId)
        .order('creado_en', { ascending: false })
      if (error) throw error
      return data as unknown as SolicitudPortalCliente[]
    },

    async archivar({ solicitudId, archivada }) {
      if (!client) throw new Error('Supabase no está configurado.')
      const { data: auth, error: authError } = await client.auth.getUser()
      if (authError || !auth.user) throw new Error('La sesión no es válida.')
      const consulta = archivada
        ? client
            .from('solicitudes_archivadas')
            // ON CONFLICT DO NOTHING: la tabla no otorga UPDATE (ver la migración).
            .upsert(
              { solicitud_id: solicitudId, usuario_id: auth.user.id },
              { ignoreDuplicates: true },
            )
        : client
            .from('solicitudes_archivadas')
            .delete()
            .eq('solicitud_id', solicitudId)
            .eq('usuario_id', auth.user.id)
      const { error } = await consulta
      if (error) throw error
    },

    async materiales(solicitudId: string): Promise<MaterialSolicitud[]> {
      if (!client) throw new Error('Supabase no está configurado.')
      const { data, error } = await client
        .from('solicitud_materiales')
        .select(
          'id, cantidad, costo_referencial_aplicado, creado_en, material:materiales(nombre, unidad_medida), registrado_por_usuario:usuarios!solicitud_materiales_registrado_por_fkey(nombre_completo)',
        )
        .eq('solicitud_id', solicitudId)
        .order('creado_en', { ascending: false })
      if (error) throw error
      return data as unknown as MaterialSolicitud[]
    },

    async agregarMaterial({
      solicitud_id,
      material_id,
      cantidad,
      costo_referencial_aplicado,
    }: AgregarMaterialInput): Promise<void> {
      if (!client) throw new Error('Supabase no está configurado.')
      const { error } = await client.rpc('agregar_material_solicitud_gestor', {
        p_solicitud_id: solicitud_id,
        p_material_id: material_id,
        p_cantidad: cantidad,
        p_costo_referencial_aplicado: costo_referencial_aplicado,
      })
      if (error) throw error
    },

    async comunicaciones(solicitudId?: string): Promise<Comunicacion[]> {
      if (!client || !solicitudId) return []
      const { data, error } = await client
        .from('solicitud_comunicaciones')
        .select(
          'id,solicitud_id,tipo,asunto,mensaje,monto,creado_en,enviado_por,remitente:usuarios!solicitud_comunicaciones_enviado_por_fkey(nombre_completo),adjuntos:solicitud_comunicacion_adjuntos(id,nombre_archivo,ruta_storage,mime_type)',
        )
        .eq('solicitud_id', solicitudId)
        .order('creado_en', { ascending: false })
      if (error) throw error
      const comunicaciones = data as unknown as Comunicacion[]
      return Promise.all(
        comunicaciones.map(async (item) => ({
          ...item,
          adjuntos: await Promise.all(
            item.adjuntos.map(async (adjunto) => {
              const { data: enlace } = await client.storage
                .from('solicitudes-adjuntos')
                .createSignedUrl(adjunto.ruta_storage, 3600)
              return { ...adjunto, url: enlace?.signedUrl }
            }),
          ),
        })),
      )
    },

    async enviarComunicacion(input: EnviarComunicacionInput): Promise<string> {
      if (!client) throw new Error('Supabase no está configurado.')
      const { data: auth, error: authError } = await client.auth.getUser()
      if (authError || !auth.user) throw new Error('La sesión no es válida.')
      const { data: comunicacion, error } = await client
        .from('solicitud_comunicaciones')
        .insert({
          solicitud_id: input.solicitudId,
          tipo: input.tipo,
          asunto: input.asunto.trim(),
          mensaje: input.mensaje.trim(),
          monto: input.tipo === 'proforma' ? input.monto : null,
          enviado_por: auth.user.id,
        })
        .select('id')
        .single()
      if (error) throw error
      for (const archivo of input.archivos) {
        const id = crypto.randomUUID()
        const nombre = archivo.name.replace(/[^a-zA-Z0-9._-]/g, '_')
        const ruta = `${input.solicitudId}/comunicaciones/${comunicacion.id}/${id}-${nombre}`
        const subida = await client.storage.from('solicitudes-adjuntos').upload(ruta, archivo)
        if (subida.error) throw subida.error
        const registro = await client.from('solicitud_comunicacion_adjuntos').insert({
          id,
          comunicacion_id: comunicacion.id,
          solicitud_id: input.solicitudId,
          nombre_archivo: archivo.name,
          ruta_storage: ruta,
          mime_type: archivo.type,
          tamano_bytes: archivo.size,
        })
        if (registro.error) {
          await client.storage.from('solicitudes-adjuntos').remove([ruta])
          throw registro.error
        }
      }
      return input.solicitudId
    },

    async tracking(solicitudId: string): Promise<ActividadSolicitud[]> {
      if (!client) throw new Error('Supabase no está configurado.')
      const { data, error } = await client
        .from('solicitud_actividades')
        .select(
          'id, solicitud_id, tipo, titulo, descripcion, datos, creado_en, actor:usuarios!solicitud_actividades_actor_id_fkey(nombre_completo)',
        )
        .eq('solicitud_id', solicitudId)
        .order('creado_en', { ascending: false })
        .order('id', { ascending: false })
      if (error) throw error
      return data as unknown as ActividadSolicitud[]
    },

    async gestionar(input: GestionInput): Promise<{ solicitud_id: string }> {
      if (!client) throw new Error('Supabase no está configurado.')
      const { data, error } = await client.functions.invoke('gestionar-solicitud', {
        body: input,
      })
      if (error) {
        const contexto = 'context' in error ? error.context : null
        if (contexto instanceof Response) {
          const detalle = (await contexto
            .clone()
            .json()
            .catch(() => null)) as { error?: string } | null
          if (detalle?.error) throw new Error(detalle.error)
        }
        throw error
      }
      if (data?.error) throw new Error(data.error as string)
      return data as { solicitud_id: string }
    },

    async resolverPeticion(input: ResolverPeticionInput): Promise<{ solicitud_id: string }> {
      if (!client) throw new Error('Supabase no está configurado.')
      const { data, error } = await client.rpc('resolver_peticion_solicitud', {
        p_peticion_id: input.peticion_id,
        p_aprobar: input.aprobar,
        p_comentario: input.motivo || null,
      })
      if (error) throw error
      return { solicitud_id: data as string }
    },

    async operadoresActivos(): Promise<OperadorResumen[]> {
      if (!client) throw new Error('Supabase no está configurado.')
      const { data, error } = await client
        .from('usuarios')
        .select(
          'id, nombre_completo, usuario_roles!usuario_roles_usuario_id_fkey!inner(roles!inner(codigo))',
        )
        .eq('activo', true)
        .eq('usuario_roles.roles.codigo', 'operador')
        .order('nombre_completo')
      if (error) throw error
      return data as unknown as OperadorResumen[]
    },

    async solicitudesOriginalesDisponibles(
      clienteId: string,
      equipoId: string,
    ): Promise<SolicitudOriginalDisponible[]> {
      if (!client) throw new Error('Supabase no está configurado.')
      const { data, error } = await client
        .from('solicitudes')
        .select('id, numero, nombre')
        .eq('cliente_id', clienteId)
        .eq('equipo_id', equipoId)
        .in('estado', ['atendida', 'cerrada'])
        .order('creado_en', { ascending: false })
      if (error) throw error
      return data as SolicitudOriginalDisponible[]
    },
  }
}
