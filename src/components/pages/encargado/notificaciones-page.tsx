import { Badge } from '@/components/atoms/badge'
import { Skeleton } from '@/components/atoms/skeleton'
import { PageHeader } from '@/components/molecules/page-header'
import { InternalNotifications } from '@/components/organisms/internal-notifications'
import { useEnviosNotificaciones } from '@/features/notificaciones/hooks/use-notificaciones'
import { normalizarError } from '@/lib/errores'

export function NotificacionesPage() {
  const envios = useEnviosNotificaciones()

  return (
    <section className="space-y-6">
      <InternalNotifications />
      <PageHeader
        title="Envíos de correo"
        description="Últimos correos enviados a clientes y avisos internos de la empresa. El interruptor global y la cuenta de soporte se configuran en Administración → Correo."
      />
      <section className="rounded-lg border bg-card p-5 shadow-sm">
        <div className="space-y-3">
          {envios.isLoading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="space-y-2 rounded-md border p-3">
                <Skeleton className="h-3 w-1/3" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))
          ) : envios.error ? (
            <p
              role="alert"
              className="rounded-md bg-destructive-soft p-3 text-sm text-destructive-soft-foreground"
            >
              {normalizarError(envios.error).mensaje}
            </p>
          ) : envios.data?.length ? (
            envios.data.map((envio) => (
              <article key={envio.id} className="rounded-md border p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">
                    {envio.tipo === 'aviso_interno'
                      ? envio.asunto
                      : `Cambio de estado: ${(envio.estado ?? '').replace(/_/g, ' ')}`}
                  </span>
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
            <p className="text-sm text-muted-foreground">No hay envíos registrados.</p>
          )}
        </div>
      </section>
    </section>
  )
}
