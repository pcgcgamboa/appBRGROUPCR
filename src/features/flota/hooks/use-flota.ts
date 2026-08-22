import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type {
  FotoVehiculo,
  MovimientoVehiculoInput,
  ReporteFlota,
  ResponsableRuta,
  RutaProceso,
  RutaProcesoInput,
} from '@/features/flota/types/flota.types'

function cliente() {
  if (!supabase) throw new Error('Supabase no está configurado.')
  return supabase
}

export function useRutasProceso() {
  return useQuery({
    queryKey: ['rutas-proceso'],
    queryFn: async () => {
      const { data, error } = await cliente()
        .from('rutas_proceso')
        .select(
          'id,codigo,nombre,descripcion,fecha_programada,estado,responsable_id,responsable:usuarios!rutas_proceso_responsable_id_fkey(nombre_completo),ruta_solicitudes(solicitud_id,orden,solicitud:solicitudes(numero,nombre)),ruta_vehiculos(vehiculo_id,es_principal,vehiculo:vehiculos(placa,tipo,kilometraje_actual))',
        )
        .order('fecha_programada', { ascending: false })
      if (error) throw error
      return data as unknown as RutaProceso[]
    },
  })
}

export function useResponsablesRuta() {
  return useQuery({
    queryKey: ['responsables-ruta'],
    queryFn: async () => {
      const { data, error } = await cliente()
        .from('usuarios')
        .select('id,nombre_completo,usuario_roles(rol:roles(codigo))')
        .eq('activo', true)
      if (error) throw error
      return (data as unknown as ResponsableRuta[]).filter((u) =>
        u.usuario_roles.some((ur) => ur.rol && ['operador', 'encargado'].includes(ur.rol.codigo)),
      )
    },
  })
}

export function useGuardarRutaProceso() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: RutaProcesoInput) => {
      const { data, error } = await cliente().rpc('guardar_ruta_proceso', {
        p_id: input.id ?? null,
        p_codigo: input.codigo,
        p_nombre: input.nombre,
        p_descripcion: input.descripcion,
        p_fecha: input.fecha,
        p_estado: input.estado,
        p_responsable_id: input.responsable_id,
        p_solicitudes: input.solicitudes,
        p_vehiculos: input.vehiculos,
      })
      if (error) throw error
      return data as string
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rutas-proceso'] }),
  })
}

export function useRegistrarMovimientoVehiculo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: MovimientoVehiculoInput) => {
      const { data: auth } = await cliente().auth.getUser()
      if (!auth.user) throw new Error('Sesión no válida.')
      const { error } = await cliente()
        .from('ruta_movimientos_vehiculo')
        .insert({ ...input, registrado_por: auth.user.id })
      if (error) throw error
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['reporte-flota'] })
      void queryClient.invalidateQueries({ queryKey: ['movimientos-vehiculo'] })
      void queryClient.invalidateQueries({ queryKey: ['catalogo', 'vehiculos'] })
    },
  })
}

export function useFotosVehiculo(vehiculoId: string | null) {
  return useQuery({
    queryKey: ['fotos-vehiculo', vehiculoId],
    enabled: Boolean(vehiculoId),
    queryFn: async () => {
      const { data, error } = await cliente()
        .from('vehiculo_fotos')
        .select('*')
        .eq('vehiculo_id', vehiculoId!)
        .order('creado_en', { ascending: false })
      if (error) throw error
      return Promise.all(
        (data as FotoVehiculo[]).map(async (foto) => {
          const { data: url } = await cliente()
            .storage.from('vehiculos-fotos')
            .createSignedUrl(foto.ruta_storage, 3600)
          return { ...foto, url: url?.signedUrl }
        }),
      )
    },
  })
}

export function useGestionFotosVehiculo() {
  const queryClient = useQueryClient()
  const subir = useMutation({
    mutationFn: async ({
      vehiculoId,
      archivos,
      descripcion,
    }: {
      vehiculoId: string
      archivos: File[]
      descripcion: string
    }) => {
      const { data: auth } = await cliente().auth.getUser()
      if (!auth.user) throw new Error('Sesión no válida.')
      for (const archivo of archivos) {
        const extension = archivo.name.split('.').pop()?.toLowerCase() || 'jpg'
        const ruta = `${vehiculoId}/${crypto.randomUUID()}.${extension}`
        const { error: uploadError } = await cliente()
          .storage.from('vehiculos-fotos')
          .upload(ruta, archivo, { contentType: archivo.type, upsert: false })
        if (uploadError) throw uploadError
        const { error } = await cliente()
          .from('vehiculo_fotos')
          .insert({
            vehiculo_id: vehiculoId,
            nombre_archivo: archivo.name,
            ruta_storage: ruta,
            mime_type: archivo.type,
            tamano_bytes: archivo.size,
            descripcion: descripcion || null,
            subido_por: auth.user.id,
          })
        if (error) {
          await cliente().storage.from('vehiculos-fotos').remove([ruta])
          throw error
        }
      }
    },
    onSuccess: (_, input) =>
      queryClient.invalidateQueries({ queryKey: ['fotos-vehiculo', input.vehiculoId] }),
  })
  const eliminar = useMutation({
    mutationFn: async (foto: FotoVehiculo) => {
      const { error: storageError } = await cliente()
        .storage.from('vehiculos-fotos')
        .remove([foto.ruta_storage])
      if (storageError) throw storageError
      const { error } = await cliente().from('vehiculo_fotos').delete().eq('id', foto.id)
      if (error) throw error
    },
    onSuccess: (_, foto) =>
      queryClient.invalidateQueries({ queryKey: ['fotos-vehiculo', foto.vehiculo_id] }),
  })
  return { subir, eliminar }
}

export function useMovimientosVehiculo() {
  return useQuery({
    queryKey: ['movimientos-vehiculo'],
    queryFn: async () => {
      const { data, error } = await cliente()
        .from('ruta_movimientos_vehiculo')
        .select(
          'id,tipo,cantidad,unidad,monto,detalle,fecha,ruta:rutas_proceso(codigo),vehiculo:vehiculos(placa)',
        )
        .order('fecha', { ascending: false })
        .limit(50)
      if (error) throw error
      return data
    },
  })
}

export function useReporteFlota() {
  return useQuery({
    queryKey: ['reporte-flota'],
    queryFn: async () => {
      const { data, error } = await cliente().rpc('obtener_reporte_flota')
      if (error) throw error
      return data as ReporteFlota
    },
    staleTime: 60_000,
  })
}

export function useHistorialVehiculos() {
  return useQuery({
    queryKey: ['historial-vehiculos'],
    queryFn: async () => {
      const [indisponibilidades, gastos] = await Promise.all([
        cliente()
          .from('vehiculo_indisponibilidades')
          .select('id,razon,detalle,inicio,fin,vehiculo:vehiculos(placa)')
          .order('inicio', { ascending: false }),
        cliente()
          .from('vehiculo_gastos')
          .select('id,tipo,concepto,monto,fecha,vehiculo:vehiculos(placa)')
          .order('fecha', { ascending: false }),
      ])
      if (indisponibilidades.error) throw indisponibilidades.error
      if (gastos.error) throw gastos.error
      return { indisponibilidades: indisponibilidades.data, gastos: gastos.data }
    },
  })
}

export function useRegistrarGestionVehiculo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      clase: 'indisponibilidad' | 'gasto'
      vehiculo_id: string
      razon?: string
      detalle?: string
      inicio?: string
      fin?: string | null
      tipo?: string
      concepto?: string
      monto?: number
      fecha?: string
    }) => {
      const { data: auth } = await cliente().auth.getUser()
      if (!auth.user) throw new Error('Sesión no válida.')
      if (input.clase === 'indisponibilidad') {
        const { error } = await cliente()
          .from('vehiculo_indisponibilidades')
          .insert({
            vehiculo_id: input.vehiculo_id,
            razon: input.razon,
            detalle: input.detalle || null,
            inicio: input.inicio,
            fin: input.fin || null,
            registrado_por: auth.user.id,
          })
        if (error) throw error
        const { error: updateError } = await cliente()
          .from('vehiculos')
          .update({ estado: 'mantenimiento' })
          .eq('id', input.vehiculo_id)
        if (updateError) throw updateError
      } else {
        const { error } = await cliente().from('vehiculo_gastos').insert({
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
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['historial-vehiculos'] })
      void queryClient.invalidateQueries({ queryKey: ['catalogo', 'vehiculos'] })
      void queryClient.invalidateQueries({ queryKey: ['reporte-flota'] })
    },
  })
}
