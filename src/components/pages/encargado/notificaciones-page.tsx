import { useState } from 'react'
import { Badge } from '@/components/atoms/badge'
import { Checkbox } from '@/components/atoms/checkbox'
import { Skeleton } from '@/components/atoms/skeleton'
import { PageHeader } from '@/components/molecules/page-header'
import { InternalNotifications } from '@/components/organisms/internal-notifications'
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
      <InternalNotifications />
      <PageHeader
        title="Notificaciones al cliente"
        description="Active el correo individualmente para cada cambio de estado."
      />
      {(configuracion.error ?? guardar.error) && (
        <p
          role="alert"
          className="rounded-md bg-destructive-soft p-3 text-sm text-destructive-soft-foreground"
        >
          {(configuracion.error ?? guardar.error)?.message}
        </p>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        {configuracion.isLoading &&
          Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="space-y-2 rounded-lg border bg-card p-4 shadow-sm">
              <Skeleton className="h-3 w-1/3" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        {configuracion.data?.map((solicitud) => (
          <button
            type="button"
            key={solicitud.id}
            onClick={() => setSeleccionada(solicitud)}
            className={
              seleccionada?.id === solicitud.id
                ? 'rounded-lg border-2 border-primary bg-card p-4 text-left shadow-sm'
                : 'rounded-lg border bg-card p-4 text-left shadow-sm'
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
          <section className="rounded-lg border bg-card p-5 shadow-sm">
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
                    <Checkbox
                      checked={activa}
                      disabled={guardar.isPending}
                      onCheckedChange={(checked) => void cambiar(estado, checked === true)}
                    />
                  </label>
                )
              })}
            </div>
          </section>
          <section className="rounded-lg border bg-card p-5 shadow-sm">
            <h2 className="font-semibold">Últimos envíos</h2>
            <div className="mt-4 space-y-3">
              {envios.isLoading ? (
                Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="space-y-2 rounded-md border p-3">
                    <Skeleton className="h-3 w-1/3" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                ))
              ) : envios.data?.length ? (
                envios.data.map((envio) => (
                  <article key={envio.id} className="rounded-md border p-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="capitalize">{envio.estado.replace(/_/g, ' ')}</span>
                      <Badge
                        variant={
                          envio.resultado === 'error'
                            ? 'destructive'
                            : envio.resultado === 'enviado'
                              ? 'success'
                              : 'default'
                        }
                      >
                        {envio.resultado}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {envio.destinatario ?? 'Sin destinatario'}
                    </p>
                    {envio.detalle_error && (
                      <p className="mt-2 text-xs text-destructive">{envio.detalle_error}</p>
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
