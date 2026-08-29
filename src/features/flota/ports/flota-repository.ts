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
 * Puerto del dominio `flota`: define el contrato de acceso a datos sin
 * atarse a Supabase. Los hooks de React consumen esta interfaz; el adaptador
 * concreto (`adapters/supabase-flota-repository.ts`) la implementa con
 * supabase-js. Esto permite sustituirla por un fake en pruebas unitarias sin
 * tocar los hooks ni los componentes.
 */
export interface FlotaRepository {
  rutasProceso(): Promise<RutaProceso[]>
  responsablesRuta(): Promise<ResponsableRuta[]>
  guardarRutaProceso(input: RutaProcesoInput): Promise<string>
  registrarMovimientoVehiculo(input: MovimientoVehiculoInput): Promise<void>
  gastosRuta(rutaId: string): Promise<RutaGasto[]>
  registrarGastoRuta(input: RutaGastoInput): Promise<void>
  fotosVehiculo(vehiculoId: string): Promise<FotoVehiculo[]>
  subirFotosVehiculo(input: SubirFotosVehiculoInput): Promise<void>
  eliminarFotoVehiculo(foto: FotoVehiculo): Promise<void>
  movimientosVehiculo(): Promise<MovimientoVehiculoResumen[]>
  reporteFlota(): Promise<ReporteFlota>
  historialVehiculos(): Promise<HistorialVehiculos>
  registrarGestionVehiculo(input: GestionVehiculoInput): Promise<void>
  trackingRuta(rutaId: string): Promise<ActividadRuta[]>
}
