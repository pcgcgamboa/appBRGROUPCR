import type {
  Comunicacion,
  EstadoSolicitud,
  MaterialSolicitud,
  MiSolicitud,
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

export interface CrearSolicitudInput extends SolicitudFormData {
  cliente_id: string
  solicitante_id: string
  archivos: File[]
  como_gestor?: boolean
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
  accion: 'asignar' | 'cambiar_estado' | 'rechazar' | 'reabrir' | 'resolver_peticion'
  solicitud_id: string
  prioridad?: 'baja' | 'media' | 'alta' | 'urgente'
  operador_id?: string
  estado?: EstadoSolicitud
  motivo?: string
  peticion_id?: string
  aprobar?: boolean
}

export interface ResolverPeticionInput {
  peticion_id: string
  aprobar: boolean
  motivo?: string
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
  editarDatos(input: EditarSolicitudInput): Promise<void>
  misSolicitudes(usuarioId?: string): Promise<MiSolicitud[]>
  materiales(solicitudId: string): Promise<MaterialSolicitud[]>
  agregarMaterial(input: AgregarMaterialInput): Promise<void>
  comunicaciones(solicitudId?: string): Promise<Comunicacion[]>
  enviarComunicacion(input: EnviarComunicacionInput): Promise<string>
  tracking(solicitudId: string): Promise<ActividadSolicitud[]>
  gestionar(input: GestionInput): Promise<{ solicitud_id: string }>
  resolverPeticion(input: ResolverPeticionInput): Promise<{ solicitud_id: string }>
  operadoresActivos(): Promise<OperadorResumen[]>
}
