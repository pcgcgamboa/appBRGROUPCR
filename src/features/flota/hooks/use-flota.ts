import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { flotaRepository } from '@/features/flota/lib/repository'
import type {
  FotoVehiculo,
  GestionVehiculoInput,
  MovimientoVehiculoInput,
  RutaProcesoInput,
  RutaGastoInput,
  SubirFotosVehiculoInput,
} from '@/features/flota/types/flota.types'

export function useRutasProceso() {
  return useQuery({
    queryKey: ['rutas-proceso'],
    queryFn: () => flotaRepository.rutasProceso(),
  })
}

export function useSolicitudesProgramadas() {
  return useQuery({
    queryKey: ['solicitudes-programadas'],
    queryFn: () => flotaRepository.solicitudesProgramadas(),
  })
}

export function useProgramarSolicitud() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ solicitudId, fecha }: { solicitudId: string; fecha: string }) =>
      flotaRepository.programarSolicitud(solicitudId, fecha),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['solicitudes-programadas'] }),
  })
}

export function useResponsablesRuta() {
  return useQuery({
    queryKey: ['responsables-ruta'],
    queryFn: () => flotaRepository.responsablesRuta(),
  })
}

export function useGuardarRutaProceso() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: RutaProcesoInput) => flotaRepository.guardarRutaProceso(input),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['rutas-proceso'] }),
        // La lista de solicitudes para ruta marca las que ya están en una ("Ya está en la ruta …").
        queryClient.invalidateQueries({ queryKey: ['solicitudes-rutas'] }),
      ]),
  })
}

export function useRegistrarMovimientoVehiculo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: MovimientoVehiculoInput) =>
      flotaRepository.registrarMovimientoVehiculo(input),
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
    queryFn: () => flotaRepository.fotosVehiculo(vehiculoId!),
  })
}

export function useGestionFotosVehiculo() {
  const queryClient = useQueryClient()
  const subir = useMutation({
    mutationFn: (input: SubirFotosVehiculoInput) => flotaRepository.subirFotosVehiculo(input),
    onSuccess: (_, input) =>
      queryClient.invalidateQueries({ queryKey: ['fotos-vehiculo', input.vehiculoId] }),
  })
  const eliminar = useMutation({
    mutationFn: (foto: FotoVehiculo) => flotaRepository.eliminarFotoVehiculo(foto),
    onSuccess: (_, foto) =>
      queryClient.invalidateQueries({ queryKey: ['fotos-vehiculo', foto.vehiculo_id] }),
  })
  return { subir, eliminar }
}

export function useMovimientosVehiculo() {
  return useQuery({
    queryKey: ['movimientos-vehiculo'],
    queryFn: () => flotaRepository.movimientosVehiculo(),
  })
}

export function useReporteFlota() {
  return useQuery({
    queryKey: ['reporte-flota'],
    queryFn: () => flotaRepository.reporteFlota(),
    staleTime: 60_000,
  })
}

export function useHistorialVehiculos() {
  return useQuery({
    queryKey: ['historial-vehiculos'],
    queryFn: () => flotaRepository.historialVehiculos(),
  })
}

export function useRegistrarGestionVehiculo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: GestionVehiculoInput) => flotaRepository.registrarGestionVehiculo(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['historial-vehiculos'] })
      void queryClient.invalidateQueries({ queryKey: ['catalogo', 'vehiculos'] })
      void queryClient.invalidateQueries({ queryKey: ['reporte-flota'] })
    },
  })
}

export function useGastosRuta(rutaId: string | null) {
  return useQuery({
    queryKey: ['gastos-ruta', rutaId],
    enabled: Boolean(rutaId),
    queryFn: () => flotaRepository.gastosRuta(rutaId!),
  })
}

export function useRegistrarGastoRuta() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: RutaGastoInput) => flotaRepository.registrarGastoRuta(input),
    onSuccess: (_, input) => {
      void queryClient.invalidateQueries({ queryKey: ['gastos-ruta', input.ruta_id] })
      void queryClient.invalidateQueries({ queryKey: ['tracking-ruta', input.ruta_id] })
      void queryClient.invalidateQueries({ queryKey: ['reporte-flota'] })
    },
  })
}
