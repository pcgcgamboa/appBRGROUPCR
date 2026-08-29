import type { SupabaseClient } from '@supabase/supabase-js'
import type { FlotaRepository } from '@/features/flota/ports/flota-repository'
import type {
  ActividadRuta,
  FotoVehiculo,
  GestionVehiculoInput,
  HistorialVehiculos,
  MovimientoVehiculoInput,
  MovimientoVehiculoResumen,
  ReporteFlota,
  ResponsableRuta,
  RutaProceso,
  RutaProcesoInput,
  RutaGasto,
  RutaGastoInput,
  SubirFotosVehiculoInput,
} from '@/features/flota/types/flota.types'

/**
 * Adaptador concreto de `FlotaRepository` sobre supabase-js. Cada mÃ©todo
 * verifica que el cliente estÃ© configurado (`client` puede ser
ull` cuando
 * las variables de entorno de Supabase no estÃ¡n presentes) para no romper el
 * arranque de la app â€” el chequeo se hace por mÃ©todo, no al construir la
 * instancia, replicando el patrÃ³n `if (!supabase) throw ...` que ya usaban
 * los hooks.
 */
export function createSupabaseFlotaRepository(client: SupabaseClient | null): FlotaRepository {
  function requerirCliente(): SupabaseClient {
    if (!client) throw new Error('Supabase no estÃ¡ configurado.')
    return client
  }

  return {
    async rutasProceso(): Promise<RutaProceso[]> {
      const { data, error } = await requerirCliente()
        .from('rutas_proceso')
        .select(
          'id,codigo,nombre,descripcion,fecha_programada,estado,responsable_id,responsable:usuarios!rutas_proceso_responsable_id_fkey(nombre_completo),ruta_solicitudes(solicitud_id,orden,solicitud:solicitudes(numero,nombre)),ruta_vehiculos(vehiculo_id,es_principal,vehiculo:vehiculos(placa,tipo,kilometraje_actual)),ruta_participantes(usuario_id,viatico,detalle_viatico,usuario:usuarios(nombre_completo))',
        )
        .order('fecha_programada', { ascending: false })
      if (error) throw error
      return data as unknown as RutaProceso[]
    },

    async responsablesRuta(): Promise<ResponsableRuta[]> {
      const { data, error } = await requerirCliente()
        .from('usuarios')
        .select('id,nombre_completo,usuario_roles(rol:roles(codigo))')
        .eq('activo', true)
      if (error) throw error
      return (data as unknown as ResponsableRuta[]).filter((u) =>
        u.usuario_roles.some((ur) => ur.rol && ['operador', 'encargado'].includes(ur.rol.codigo)),
      )
    },

    async guardarRutaProceso(input: RutaProcesoInput): Promise<string> {
      const { data, error } = await requerirCliente().rpc('guardar_ruta_proceso', {
        p_id: input.id ?? null,
        p_codigo: input.codigo,
        p_nombre: input.nombre,
        p_descripcion: input.descripcion,
        p_fecha: input.fecha,
        p_estado: input.estado,
        p_responsable_id: input.responsable_id,
        p_solicitudes: input.solicitudes,
        p_vehiculos: input.vehiculos,
        p_participantes: input.participantes,
      })
      if (error) throw error
      return data as string
    },

    async gastosRuta(rutaId: string): Promise<RutaGasto[]> {
      const { data, error } = await requerirCliente()
        .from('ruta_gastos')
        .select(
          'id,ruta_id,participante_id,concepto,monto,fecha,detalle,participante:usuarios(nombre_completo)',
        )
        .eq('ruta_id', rutaId)
        .order('fecha', { ascending: false })
        .order('creado_en', { ascending: false })
      if (error) throw error
      return data as unknown as RutaGasto[]
    },

    async registrarGastoRuta(input: RutaGastoInput): Promise<void> {
      const supabase = requerirCliente()
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) throw new Error('Sesión no válida.')
      const { error } = await supabase.from('ruta_gastos').insert({
        ...input,
        registrado_por: auth.user.id,
      })
      if (error) throw error
    },
    async registrarMovimientoVehiculo(input: MovimientoVehiculoInput): Promise<void> {
      const supabase = requerirCliente()
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) throw new Error('SesiÃ³n no vÃ¡lida.')
      const { error } = await supabase
        .from('ruta_movimientos_vehiculo')
        .insert({ ...input, registrado_por: auth.user.id })
      if (error) throw error
    },

    async fotosVehiculo(vehiculoId: string): Promise<FotoVehiculo[]> {
      const supabase = requerirCliente()
      const { data, error } = await supabase
        .from('vehiculo_fotos')
        .select('*')
        .eq('vehiculo_id', vehiculoId)
        .order('creado_en', { ascending: false })
      if (error) throw error
      return Promise.all(
        (data as FotoVehiculo[]).map(async (foto) => {
          const { data: url } = await supabase.storage
            .from('vehiculos-fotos')
            .createSignedUrl(foto.ruta_storage, 3600)
          return { ...foto, url: url?.signedUrl }
        }),
      )
    },

    async subirFotosVehiculo({
      vehiculoId,
      archivos,
      descripcion,
    }: SubirFotosVehiculoInput): Promise<void> {
      const supabase = requerirCliente()
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) throw new Error('SesiÃ³n no vÃ¡lida.')
      for (const archivo of archivos) {
        const extension = archivo.name.split('.').pop()?.toLowerCase() || 'jpg'
        const ruta = `${vehiculoId}/${crypto.randomUUID()}.${extension}`
        const { error: uploadError } = await supabase.storage
          .from('vehiculos-fotos')
          .upload(ruta, archivo, { contentType: archivo.type, upsert: false })
        if (uploadError) throw uploadError
        const { error } = await supabase.from('vehiculo_fotos').insert({
          vehiculo_id: vehiculoId,
          nombre_archivo: archivo.name,
          ruta_storage: ruta,
          mime_type: archivo.type,
          tamano_bytes: archivo.size,
          descripcion: descripcion || null,
          subido_por: auth.user.id,
        })
        if (error) {
          await supabase.storage.from('vehiculos-fotos').remove([ruta])
          throw error
        }
      }
    },

    async eliminarFotoVehiculo(foto: FotoVehiculo): Promise<void> {
      const supabase = requerirCliente()
      const { error: storageError } = await supabase.storage
        .from('vehiculos-fotos')
        .remove([foto.ruta_storage])
      if (storageError) throw storageError
      const { error } = await supabase.from('vehiculo_fotos').delete().eq('id', foto.id)
      if (error) throw error
    },

    async movimientosVehiculo(): Promise<MovimientoVehiculoResumen[]> {
      const { data, error } = await requerirCliente()
        .from('ruta_movimientos_vehiculo')
        .select(
          'id,tipo,cantidad,unidad,monto,detalle,fecha,ruta:rutas_proceso(codigo),vehiculo:vehiculos(placa)',
        )
        .order('fecha', { ascending: false })
        .limit(50)
      if (error) throw error
      return data as unknown as MovimientoVehiculoResumen[]
    },

    async reporteFlota(): Promise<ReporteFlota> {
      const { data, error } = await requerirCliente().rpc('obtener_reporte_flota')
      if (error) throw error
      return data as ReporteFlota
    },

    async historialVehiculos(): Promise<HistorialVehiculos> {
      const supabase = requerirCliente()
      const [indisponibilidades, gastos] = await Promise.all([
        supabase
          .from('vehiculo_indisponibilidades')
          .select('id,razon,detalle,inicio,fin,vehiculo:vehiculos(placa)')
          .order('inicio', { ascending: false }),
        supabase
          .from('vehiculo_gastos')
          .select('id,tipo,concepto,monto,fecha,vehiculo:vehiculos(placa)')
          .order('fecha', { ascending: false }),
      ])
      if (indisponibilidades.error) throw indisponibilidades.error
      if (gastos.error) throw gastos.error
      return {
        indisponibilidades:
          indisponibilidades.data as unknown as HistorialVehiculos['indisponibilidades'],
        gastos: gastos.data as unknown as HistorialVehiculos['gastos'],
      }
    },

    async registrarGestionVehiculo(input: GestionVehiculoInput): Promise<void> {
      const supabase = requerirCliente()
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) throw new Error('SesiÃ³n no vÃ¡lida.')
      if (input.clase === 'indisponibilidad') {
        const { error } = await supabase.from('vehiculo_indisponibilidades').insert({
          vehiculo_id: input.vehiculo_id,
          razon: input.razon,
          detalle: input.detalle || null,
          inicio: input.inicio,
          fin: input.fin || null,
          registrado_por: auth.user.id,
        })
        if (error) throw error
        const { error: updateError } = await supabase
          .from('vehiculos')
          .update({ estado: 'mantenimiento' })
          .eq('id', input.vehiculo_id)
        if (updateError) throw updateError
      } else {
        const { error } = await supabase.from('vehiculo_gastos').insert({
          vehiculo_id: input.vehiculo_id,
          tipo: input.tipo,
          concepto: input.concepto,
          monto: input.monto,
          fecha: input.fecha,
          registrado_por: auth.user.id,
        })
        if (error) throw error
      }
    },

    async trackingRuta(rutaId: string): Promise<ActividadRuta[]> {
      if (!client || !rutaId) return []
      const { data, error } = await client
        .from('ruta_actividades')
        .select(
          'id,tipo,titulo,descripcion,creado_en,actor:usuarios!ruta_actividades_actor_id_fkey(nombre_completo)',
        )
        .eq('ruta_id', rutaId)
        .order('creado_en', { ascending: false })
        .order('id', { ascending: false })
      if (error) throw error
      return data as unknown as ActividadRuta[]
    },
  }
}
