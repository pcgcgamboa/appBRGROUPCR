import { FileText } from 'lucide-react'
import { Badge } from '@/components/atoms/badge'
import { Button } from '@/components/atoms/button'
import { useAvancesSolicitud, useUrlFirmadaReporte } from '@/features/operador/hooks/use-operador'

export function ProgressHistory({ solicitudId }: { solicitudId: string }) {
  const avances = useAvancesSolicitud(solicitudId)
  const urlReporte = useUrlFirmadaReporte()

  async function verReporte(rutaStorage: string) {
    // Abre la pestaña de inmediato (dentro del gesto del clic) y solo después la redirige a la
    // URL firmada — esperar el async primero perdería el gesto de usuario y el navegador
    // bloquearía silenciosamente el popup.
    const ventana = window.open('', '_blank')
    const url = await urlReporte.mutateAsync(rutaStorage)
    if (ventana) ventana.location.href = url
  }

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">Bitácora registrada</h2>
      {avances.data?.length ? (
        avances.data.map((avance) => (
          <article key={avance.id} className="rounded-lg border bg-card p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex gap-2">
                <Badge>{avance.porcentaje}%</Badge>
                <Badge>{avance.horas_trabajadas} h</Badge>
              </div>
              <time className="text-xs text-muted-foreground">
                {new Date(avance.creado_en).toLocaleString('es-CR')}
              </time>
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm">{avance.narrativa}</p>
            <p className="mt-3 text-xs text-muted-foreground">
              Vehículo: {avance.vehiculo?.placa ?? '—'}
            </p>
            {avance.solicitud_materiales.length > 0 && (
              <ul className="mt-3 list-inside list-disc text-sm">
                {avance.solicitud_materiales.map((item, index) => (
                  <li key={`${item.material?.nombre}-${index}`}>
                    {item.material?.nombre}: {item.cantidad} {item.material?.unidad_medida}
                  </li>
                ))}
              </ul>
            )}
            {avance.adjuntos.length > 0 && (
              <p className="mt-3 text-sm">{avance.adjuntos.length} adjunto(s)</p>
            )}
            {avance.reporte_atencion?.ruta_storage_pdf && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3"
                disabled={urlReporte.isPending}
                onClick={() => verReporte(avance.reporte_atencion!.ruta_storage_pdf!)}
              >
                <FileText className="mr-2 size-4" />
                Ver reporte de atención
              </Button>
            )}
          </article>
        ))
      ) : (
        <p className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
          Todavía no hay avances registrados.
        </p>
      )}
    </section>
  )
}
