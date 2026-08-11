import { useState } from 'react'
import { Badge } from '@/components/atoms/badge'
import { Button } from '@/components/atoms/button'
import { Select } from '@/components/atoms/select'
import { Textarea } from '@/components/atoms/textarea'
import { PageHeader } from '@/components/molecules/page-header'
import { LogoutButton } from '@/components/molecules/logout-button'
import { SlaBadge } from '@/components/molecules/sla-badge'
import { useGestionarSolicitud } from '@/features/solicitudes/hooks/use-gestionar-solicitud'
import { useOperadores } from '@/features/solicitudes/hooks/use-operadores'
import { useSolicitudesAdmin } from '@/features/solicitudes/hooks/use-solicitudes-admin'
import type {
  EstadoSolicitud,
  SolicitudAdmin,
} from '@/features/solicitudes/types/solicitudes.types'

const transiciones: Partial<Record<EstadoSolicitud, EstadoSolicitud[]>> = {
  asignada: ['en_atencion', 'cancelada'],
  en_atencion: ['en_espera_materiales', 'atendida', 'cancelada'],
  en_espera_materiales: ['en_atencion', 'atendida', 'cancelada'],
  atendida: ['cerrada', 'en_atencion', 'cancelada'],
}

export function BandejaEncargadoPage() {
  const { solicitudes } = useSolicitudesAdmin()
  const operadores = useOperadores()
  const gestionar = useGestionarSolicitud()
  const [seleccionada, setSeleccionada] = useState<SolicitudAdmin | null>(null)
  const [prioridad, setPrioridad] = useState<'baja' | 'media' | 'alta' | 'urgente'>('media')
  const [operadorId, setOperadorId] = useState('')
  const [estado, setEstado] = useState<EstadoSolicitud>('asignada')
  const [motivo, setMotivo] = useState('')

  function abrir(item: SolicitudAdmin) {
    setSeleccionada(item)
    setPrioridad(item.prioridad ?? 'media')
    setOperadorId(item.operador_id ?? '')
    setEstado(transiciones[item.estado]?.[0] ?? item.estado)
    setMotivo('')
  }

  async function ejecutar(input: Parameters<typeof gestionar.mutateAsync>[0]) {
    await gestionar.mutateAsync(input)
    setSeleccionada(null)
  }

  const rango = { urgente: 0, alta: 1, media: 2, baja: 3 }
  const ordenadas = [...(solicitudes.data ?? [])].sort(
    (a, b) => (a.prioridad ? rango[a.prioridad] : -1) - (b.prioridad ? rango[b.prioridad] : -1),
  )

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          title="Bandeja de solicitudes"
          description="Revise, priorice, asigne y controle el flujo de atención."
        />
        <LogoutButton />
      </div>
      {(solicitudes.error ?? operadores.error ?? gestionar.error) && (
        <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800">
          {(solicitudes.error ?? operadores.error ?? gestionar.error)?.message}
        </p>
      )}
      <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="px-4 py-3">Número</th>
              <th className="px-4 py-3">Solicitud</th>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Prioridad</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">SLA</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {ordenadas.length ? (
              ordenadas.map((item) => (
                <tr
                  key={item.id}
                  className={
                    item.prioridad === 'alta' || item.prioridad === 'urgente'
                      ? 'border-t bg-amber-50/50'
                      : 'border-t'
                  }
                >
                  <td className="px-4 py-3">#{item.numero}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{item.nombre}</div>
                    <div className="text-xs text-muted-foreground">{item.tipo?.nombre}</div>
                  </td>
                  <td className="px-4 py-3">{item.cliente?.nombre}</td>
                  <td className="px-4 py-3">
                    <Badge>{item.prioridad ?? 'Por definir'}</Badge>
                  </td>
                  <td className="px-4 py-3">{item.estado.replace(/_/g, ' ')}</td>
                  <td className="px-4 py-3">
                    <SlaBadge
                      venceEn={item.sla_vence_en}
                      estado={item.estado}
                      prioridad={item.prioridad}
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="outline" onClick={() => abrir(item)}>
                      Gestionar
                    </Button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  No hay solicitudes.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {seleccionada && (
        <div className="rounded-lg border bg-white p-5 shadow-sm">
          <h2 className="font-semibold">
            Gestionar #{seleccionada.numero}: {seleccionada.nombre}
          </h2>
          {seleccionada.estado === 'creada' || seleccionada.estado === 'asignada' ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium">
                Prioridad
                <Select
                  value={prioridad}
                  onChange={(event) => setPrioridad(event.target.value as typeof prioridad)}
                >
                  <option value="baja">Baja</option>
                  <option value="media">Media</option>
                  <option value="alta">Alta</option>
                  <option value="urgente">Urgente (24 h)</option>
                </Select>
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Operador
                <Select value={operadorId} onChange={(event) => setOperadorId(event.target.value)}>
                  <option value="">Seleccione…</option>
                  {operadores.data?.map((operador) => (
                    <option key={operador.id} value={operador.id}>
                      {operador.nombre_completo}
                    </option>
                  ))}
                </Select>
              </label>
              <div className="flex flex-wrap gap-3 sm:col-span-2">
                <Button
                  disabled={!operadorId || gestionar.isPending}
                  onClick={() =>
                    void ejecutar({
                      accion: 'asignar',
                      solicitud_id: seleccionada.id,
                      prioridad,
                      operador_id: operadorId,
                    })
                  }
                >
                  {seleccionada.estado === 'creada' ? 'Asignar solicitud' : 'Guardar reasignación'}
                </Button>
                {seleccionada.estado === 'creada' && (
                  <Button
                    variant="outline"
                    className="text-red-700"
                    onClick={() => setEstado('rechazada')}
                  >
                    Rechazar
                  </Button>
                )}
              </div>
              {estado === 'rechazada' && (
                <div className="grid gap-3 sm:col-span-2">
                  <Textarea
                    placeholder="Motivo del rechazo"
                    value={motivo}
                    onChange={(event) => setMotivo(event.target.value)}
                  />
                  <Button
                    className="w-fit"
                    disabled={!motivo.trim()}
                    onClick={() =>
                      void ejecutar({ accion: 'rechazar', solicitud_id: seleccionada.id, motivo })
                    }
                  >
                    Confirmar rechazo
                  </Button>
                </div>
              )}
            </div>
          ) : seleccionada.estado === 'cerrada' ? (
            <div className="mt-4">
              <Button
                onClick={() => void ejecutar({ accion: 'reabrir', solicitud_id: seleccionada.id })}
                disabled={gestionar.isPending}
              >
                Reabrir solicitud
              </Button>
            </div>
          ) : transiciones[seleccionada.estado] ? (
            <div className="mt-4 grid gap-4">
              <label className="grid gap-2 text-sm font-medium">
                Nuevo estado
                <Select
                  value={estado}
                  onChange={(event) => setEstado(event.target.value as EstadoSolicitud)}
                >
                  {transiciones[seleccionada.estado]?.map((item) => (
                    <option key={item} value={item}>
                      {item.replace(/_/g, ' ')}
                    </option>
                  ))}
                </Select>
              </label>
              {estado === 'cancelada' && (
                <Textarea
                  placeholder="Motivo de cancelación"
                  value={motivo}
                  onChange={(event) => setMotivo(event.target.value)}
                />
              )}
              <Button
                className="w-fit"
                disabled={gestionar.isPending || (estado === 'cancelada' && !motivo.trim())}
                onClick={() =>
                  void ejecutar({
                    accion: 'cambiar_estado',
                    solicitud_id: seleccionada.id,
                    estado,
                    motivo,
                  })
                }
              >
                Aplicar cambio
              </Button>
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">
              Este estado no admite acciones adicionales.
            </p>
          )}
          <Button variant="outline" className="mt-4" onClick={() => setSeleccionada(null)}>
            Cerrar panel
          </Button>
        </div>
      )}
    </section>
  )
}
