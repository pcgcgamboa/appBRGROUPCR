import type {
  Comunicacion,
  EstadoSolicitud,
  MaterialSolicitud,
  AdjuntoSolicitud,
  MiSolicitud,
  SolicitudPortalCliente,
  OperadorResumen,
  SolicitudAdmin,
} from '@/features/solicitudes/types/solicitudes.types'
import type { ActividadSolicitud } from '@/features/solicitudes/types/tracking.types'
import type { SolicitudFormData } from '@/features/solicitudes/schemas/solicitud.schema'

export interface Intervencion {
  id: string
  operador_id: string | null
  estado: EstadoSolicitud
  motivo_rechazo_cancelacion: string | null
}

export interface EquipoNuevoInput {
  nombre: string
  marca?: string
  modelo?: string
  serie?: string
}

export interface EditarBorradorInput extends SolicitudFormData {
  id: string
  equipo_id: string | null
  /** Archivos nuevos a adjuntar al borrador. */
  archivos: File[]
}

export interface AplicarGarantiaInput {
  solicitud_original_id: string
  detalle: string
  idempotencia_clave?: string
}

export interface CrearSolicitudInput extends SolicitudFormData {
  cliente_id: string
  solicitante_id: string
  archivos: File[]
  como_gestor?: boolean
  /** Equipo ya registrado para el cliente. Si se omite y se envía `equipo_nuevo`, se crea uno
   * nuevo en la misma transacción y queda asociado al cliente. */
  equipo_id?: string | null
  equipo_nuevo?: EquipoNuevoInput | null
  /** Solicitud previa que se reclama por garantía. Obligatoria server-side cuando el tipo
   * elegido tiene `es_garantia`. */
  solicitud_original_id?: string | null
  /** Estable mientras el cliente reintenta el mismo envío. Un reintento con la misma clave
   * devuelve la solicitud ya creada en vez de duplicarla. */
  idempotencia_clave: string
}

export interface EditarSolicitudInput {
  solicitud_id: string
  nombre: string
  detalle: string
  cliente_id: string
  ubicacion_id: string
  tipo_solicitud_id: string
  prioridad: 'baja' | 'media' | 'alta' | 'urgente' | null
  archivos: File[]
}

export interface AgregarMaterialInput {
  solicitud_id: string
  material_id: string
  cantidad: number
  costo_referencial_aplicado: number | null
}

export interface EnviarComunicacionInput {
  solicitudId: string
  tipo: 'mensaje' | 'proforma'
  asunto: string
  mensaje: string
  monto: number | null
  archivos: File[]
}

export interface GestionInput {
  accion:
    | 'asignar'
    | 'cambiar_estado'
    | 'rechazar'
    | 'reabrir'
    | 'resolver_peticion'
    | 'notificar_cliente'
  solicitud_id: string
  prioridad?: 'baja' | 'media' | 'alta' | 'urgente'
  operador_id?: string
  estado?: EstadoSolicitud
  motivo?: string
  /** notificar_cliente: contenido editado antes de enviar. */
  asunto?: string
  mensaje?: string
  peticion_id?: string
  aprobar?: boolean
}

export interface ResolverPeticionInput {
  peticion_id: string
  aprobar: boolean
  motivo?: string
}

export interface SolicitudOriginalDisponible {
  id: string
  numero: number
  nombre: string
}

/**
 * Puerto del dominio `solicitudes`: define el contrato de acceso a datos sin
 * atarse a Supabase. Los hooks de React consumen esta interfaz; el adaptador
 * concreto (`adapters/supabase-solicitud-repository.ts`) la implementa con
 * supabase-js. Esto permite sustituirla por un fake en pruebas unitarias sin
 * tocar los hooks ni los componentes.
 */
export interface SolicitudRepository {
  listarAdmin(): Promise<SolicitudAdmin[]>
  intervenir(input: Intervencion): Promise<void>
  crear(input: CrearSolicitudInput): Promise<{ id: string; numero: number }>
  /** Portal del Cliente: envía un borrador ("creada" → "enviada") para que el proveedor lo procese. */
  enviarSolicitud(solicitudId: string): Promise<void>
  /** Portal del Cliente: modifica un borrador (solo mientras está en "creada"). */
  editarBorrador(input: EditarBorradorInput): Promise<void>
  /** Ubicación reportada en la solicitud más reciente de un equipo (null si no tiene ninguna). */
  ultimaUbicacionEquipo(equipoId: string): Promise<string | null>
  /** Adjuntos de la solicitud, con URL firmada para visualizarlos. */
  adjuntos(solicitudId: string): Promise<AdjuntoSolicitud[]>
  eliminarAdjunto(adjunto: AdjuntoSolicitud): Promise<void>
  /** Crea una solicitud de garantía enlazada a una solicitud cerrada con garantía vigente. */
  aplicarGarantia(input: AplicarGarantiaInput): Promise<{ id: string; numero: number }>
  editarDatos(input: EditarSolicitudInput): Promise<void>
  misSolicitudes(usuarioId?: string): Promise<MiSolicitud[]>
  /** Todas las solicitudes de la organización del Cliente, con evaluación, garantía y reporte. */
  solicitudesPortalCliente(clienteId: string): Promise<SolicitudPortalCliente[]>
  /** Archiva (o desarchiva) una solicitud finalizada solo para el usuario actual. */
  archivar(input: { solicitudId: string; archivada: boolean }): Promise<void>
  materiales(solicitudId: string): Promise<MaterialSolicitud[]>
  agregarMaterial(input: AgregarMaterialInput): Promise<void>
  comunicaciones(solicitudId?: string): Promise<Comunicacion[]>
  enviarComunicacion(input: EnviarComunicacionInput): Promise<string>
  tracking(solicitudId: string): Promise<ActividadSolicitud[]>
  gestionar(input: GestionInput): Promise<{ solicitud_id: string }>
  resolverPeticion(input: ResolverPeticionInput): Promise<{ solicitud_id: string }>
  operadoresActivos(): Promise<OperadorResumen[]>
  /** Solicitudes ya atendidas/cerradas de un cliente y equipo — el "trabajo ya realizado" que
   * una solicitud de garantía nueva puede reclamar. */
  solicitudesOriginalesDisponibles(
    clienteId: string,
    equipoId: string,
  ): Promise<SolicitudOriginalDisponible[]>
}
