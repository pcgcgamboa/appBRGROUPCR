import { useState } from 'react'
import { Badge } from '@/components/atoms/badge'
import { PageHeader } from '@/components/molecules/page-header'
import {
  useConfiguracionNotificaciones,
  useEnviosNotificaciones,
  useGuardarNotificacion,
} from '@/features/notificaciones/hooks/use-notificaciones'
import type { SolicitudNotificaciones } from '@/features/notificaciones/types/notificaciones.types'
import type { EstadoSolicitud } from '@/features/solicitudes/types/solicitudes.types'

const estados: EstadoSolicitud[] = [
  'asignada',
  'en_atencion',
  'en_espera_materiales',
  'atendida',
  'cerrada',
  'cancelada',
  'rechazada',
]

export function NotificacionesPage() {
  const configuracion = useConfiguracionNotificaciones()
  const guardar = useGuardarNotificacion()
  const [seleccionada, setSeleccionada] = useState<SolicitudNotificaciones | null>(null)
  const envios = useEnviosNotificaciones(seleccionada?.id)
  async function cambiar(estado: EstadoSolicitud, activa: boolean) {
    if (!seleccionada) return
    await guardar.mutateAsync({ solicitud_id: seleccionada.id, estado, activa })
    setSeleccionada((current) =>
      current
        ? {
            ...current,
            notificaciones_config: [
              ...current.notificaciones_config.filter((item) => item.estado !== estado),
              { estado, activa },
            ],
          }
        : null,
    )
  }
  return (
    <section className="space-y-6">
      <PageHeader
        title="Notificaciones al cliente"
        description="Active el correo individualmente para cada cambio de estado."
      />
      {(configuracion.error ?? guardar.error) && (
        <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800">
          {(configuracion.error ?? guardar.error)?.message}
        </p>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        {configuracion.data?.map((solicitud) => (
          <button
            type="button"
            key={solicitud.id}
            onClick={() => setSeleccionada(solicitud)}
            className={
              seleccionada?.id === solicitud.id
                ? 'rounded-lg border-2 border-primary bg-white p-4 text-left shadow-sm'
                : 'rounded-lg border bg-white p-4 text-left shadow-sm'
            }
          >
            <p className="text-xs text-muted-foreground">Solicitud #{solicitud.numero}</p>
            <p className="font-semibold">{solicitud.nombre}</p>
            <p className="mt-1 text-sm">{solicitud.cliente?.nombre}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Correo: {solicitud.cliente?.email_contacto ?? 'No configurado'}
            </p>
          </button>
        ))}
      </div>
      {seleccionada && (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-lg border bg-white p-5 shadow-sm">
            <h2 className="font-semibold">Estados notificados para #{seleccionada.numero}</h2>
            <div className="mt-4 grid gap-3">
              {estados.map((estado) => {
                const activa = seleccionada.notificaciones_config.some(
                  (item) => item.estado === estado && item.activa,
                )
                return (
                  <label
                    key={estado}
                    className="flex items-center justify-between gap-4 rounded-md border p-3 text-sm"
                  >
                    <span className="capitalize">{estado.replace(/_/g, ' ')}</span>
                    <input
                      type="checkbox"
                      className="size-5"
                      checked={activa}
                      disabled={guardar.isPending}
                      onChange={(event) => void cambiar(estado, event.target.checked)}
                    />
                  </label>
                )
              })}
            </div>
          </section>
          <section className="rounded-lg border bg-white p-5 shadow-sm">
            <h2 className="font-semibold">Últimos envíos</h2>
            <div className="mt-4 space-y-3">
              {envios.data?.length ? (
                envios.data.map((envio) => (
                  <article key={envio.id} className="rounded-md border p-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="capitalize">{envio.estado.replace(/_/g, ' ')}</span>
                      <Badge
                        className={
                          envio.resultado === 'error'
                            ? 'bg-red-100 text-red-800'
                            : envio.resultado === 'enviado'
                              ? 'bg-green-100 text-green-800'
                              : ''
                        }
                      >
                        {envio.resultado}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {envio.destinatario ?? 'Sin destinatario'}
                    </p>
                    {envio.detalle_error && (
                      <p className="mt-2 text-xs text-red-700">{envio.detalle_error}</p>
                    )}
                  </article>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No hay intentos registrados.</p>
              )}
            </div>
          </section>
        </div>
      )}
    </section>
  )
}
