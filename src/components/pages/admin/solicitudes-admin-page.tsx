import { Wrench } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/components/atoms/badge'
import { Button } from '@/components/atoms/button'
import { Select } from '@/components/atoms/select'
import { Textarea } from '@/components/atoms/textarea'
import { PageHeader } from '@/components/molecules/page-header'
import { useCatalogo } from '@/features/catalogos/hooks/use-catalogo'
import type { Rol } from '@/features/catalogos/types/catalogos.types'
import { useSolicitudesAdmin } from '@/features/solicitudes/hooks/use-solicitudes-admin'
import type {
  EstadoSolicitud,
  SolicitudAdmin,
} from '@/features/solicitudes/types/solicitudes.types'
import { useUsuariosAdmin } from '@/features/usuarios/hooks/use-usuarios-admin'

const transiciones: Record<EstadoSolicitud, EstadoSolicitud[]> = {
  creada: ['creada', 'rechazada', 'cancelada'],
  asignada: ['asignada', 'en_atencion', 'cancelada'],
  en_atencion: ['en_atencion', 'en_espera_materiales', 'atendida', 'cancelada'],
  en_espera_materiales: ['en_espera_materiales', 'en_atencion', 'atendida', 'cancelada'],
  atendida: ['atendida', 'cerrada', 'en_atencion', 'cancelada'],
  cerrada: ['cerrada', 'asignada'],
  cancelada: ['cancelada'],
  rechazada: ['rechazada'],
}

export function SolicitudesAdminPage() {
  const { solicitudes, intervenir } = useSolicitudesAdmin()
  const { usuarios } = useUsuariosAdmin()
  const { listado: roles } = useCatalogo<Rol>('roles')
  const [seleccionada, setSeleccionada] = useState<SolicitudAdmin | null>(null)
  const [estado, setEstado] = useState<EstadoSolicitud>('creada')
  const [operadorId, setOperadorId] = useState<string>('')
  const [motivo, setMotivo] = useState('')
  const operadorRolId = roles.data?.find((rol) => rol.codigo === 'operador')?.id
  const operadores =
    usuarios.data?.filter(
      (usuario) =>
        usuario.activo && usuario.usuario_roles.some((rol) => rol.rol_id === operadorRolId),
    ) ?? []
  const requiereOperador = [
    'asignada',
    'en_atencion',
    'en_espera_materiales',
    'atendida',
    'cerrada',
  ].includes(estado)

  function abrir(solicitud: SolicitudAdmin) {
    setSeleccionada(solicitud)
    setEstado(solicitud.estado)
    setOperadorId(solicitud.operador_id ?? '')
    setMotivo(solicitud.motivo_rechazo_cancelacion ?? '')
  }
  async function guardar() {
    if (!seleccionada) return
    await intervenir.mutateAsync({
      id: seleccionada.id,
      estado,
      operador_id: operadorId || null,
      motivo_rechazo_cancelacion:
        estado === 'cancelada' || estado === 'rechazada' ? motivo || null : null,
    })
    setSeleccionada(null)
  }

  return (
    <section className="space-y-6">
      <PageHeader
        title="Solicitudes activas"
        description="Intervención administrativa para reasignar, cerrar o cancelar servicios."
      />
      {(solicitudes.error ?? intervenir.error) && (
        <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800">
          {(solicitudes.error ?? intervenir.error)?.message}
        </p>
      )}
      <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="px-4 py-3">Número</th>
              <th className="px-4 py-3">Solicitud</th>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Operador</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {solicitudes.isLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center">
                  Cargando…
                </td>
              </tr>
            ) : solicitudes.data?.length ? (
              solicitudes.data.map((solicitud) => (
                <tr key={solicitud.id} className="border-t">
                  <td className="px-4 py-3">#{solicitud.numero}</td>
                  <td className="px-4 py-3 font-medium">{solicitud.nombre}</td>
                  <td className="px-4 py-3">{solicitud.cliente?.nombre}</td>
                  <td className="px-4 py-3">
                    <Badge>{solicitud.estado.replace(/_/g, ' ')}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    {solicitud.operador?.nombre_completo ?? 'Sin asignar'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="outline" onClick={() => abrir(solicitud)}>
                      <Wrench className="mr-2 size-4" />
                      Intervenir
                    </Button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  No hay solicitudes activas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {seleccionada && (
        <div className="rounded-lg border bg-white p-5 shadow-sm">
          <h2 className="font-semibold">
            Intervenir #{seleccionada.numero}: {seleccionada.nombre}
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium">
              Operador
              <Select value={operadorId} onChange={(event) => setOperadorId(event.target.value)}>
                <option value="">Sin asignar</option>
                {operadores.map((operador) => (
                  <option key={operador.id} value={operador.id}>
                    {operador.nombre_completo}
                  </option>
                ))}
              </Select>
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Estado
              <Select
                required={requiereOperador}
                value={estado}
                onChange={(event) => setEstado(event.target.value as EstadoSolicitud)}
              >
                {transiciones[seleccionada.estado].map((item) => (
                  <option key={item} value={item}>
                    {item.replace(/_/g, ' ')}
                  </option>
                ))}
              </Select>
            </label>
            {(estado === 'cancelada' || estado === 'rechazada') && (
              <label className="grid gap-2 text-sm font-medium sm:col-span-2">
                Motivo
                <Textarea
                  required
                  value={motivo}
                  onChange={(event) => setMotivo(event.target.value)}
                />
              </label>
            )}
          </div>
          <div className="mt-5 flex gap-3">
            <Button
              onClick={() => void guardar()}
              disabled={intervenir.isPending || (requiereOperador && !operadorId)}
            >
              {intervenir.isPending ? 'Guardando…' : 'Guardar cambios'}
            </Button>
            <Button variant="outline" onClick={() => setSeleccionada(null)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </section>
  )
}
