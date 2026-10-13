import { FilePlus2, FileText } from 'lucide-react'
import { lazy, Suspense, useState } from 'react'
import { Badge } from '@/components/atoms/badge'
import { Button } from '@/components/atoms/button'
import { useSession } from '@/features/auth/hooks/use-session'
import { useAvancesSolicitud, useUrlFirmadaReporte } from '@/features/operador/hooks/use-operador'
import type { AvanceResumen, SolicitudOperador } from '@/features/operador/types/operador.types'

const ServiceReportPreviewDialog = lazy(() =>
  import('@/components/organisms/service-report-preview-dialog').then((m) => ({
    default: m.ServiceReportPreviewDialog,
  })),
)

const estadoEquipo = {
  funcionando: 'Funcionando',
  parcial: 'Funcionamiento parcial',
  sin_funcionar: 'Sin funcionar',
} as const

export function ProgressHistory({
  solicitudId,
  solicitud,
  operadorNombre = '',
}: {
  solicitudId: string
  /**
   * Si se indica (pantalla del operador), permite generar el PDF de un reporte que quedó pendiente
   * — p. ej. si se cerró la vista previa sin generarlo o falló la subida. Solo su autor puede.
   */
  solicitud?: SolicitudOperador
  operadorNombre?: string
}) {
  const avances = useAvancesSolicitud(solicitudId)
  const urlReporte = useUrlFirmadaReporte()
  const { session } = useSession()
  const [generando, setGenerando] = useState<AvanceResumen | null>(null)

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
        avances.data.map((avance) => {
          const reporte = avance.reporte_atencion
          const puedeGenerar =
            Boolean(solicitud) &&
            Boolean(reporte) &&
            !reporte?.ruta_storage_pdf &&
            reporte?.creado_por === session?.user.id
          return (
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
              {reporte && (
                <div className="mt-3 space-y-2 rounded-md bg-muted/40 p-3 text-sm">
                  <p>
                    <span className="font-medium">Reporte de atención</span> · Equipo:{' '}
                    {estadoEquipo[reporte.estado_equipo_final]}
                  </p>
                  {reporte.ruta_storage_pdf ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={urlReporte.isPending}
                      onClick={() => void verReporte(reporte.ruta_storage_pdf ?? '')}
                    >
                      <FileText className="mr-2 size-4" />
                      Ver reporte de atención
                    </Button>
                  ) : puedeGenerar ? (
                    <Button type="button" size="sm" onClick={() => setGenerando(avance)}>
                      <FilePlus2 className="mr-2 size-4" />
                      Generar PDF del reporte
                    </Button>
                  ) : (
                    <p className="text-xs text-warning-soft-foreground">
                      El PDF del reporte está pendiente de generar por el operador.
                    </p>
                  )}
                </div>
              )}
            </article>
          )
        })
      ) : (
        <p className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
          Todavía no hay avances registrados.
        </p>
      )}
      {generando?.reporte_atencion && solicitud && (
        <Suspense fallback={null}>
          <ServiceReportPreviewDialog
            open
            onClose={() => setGenerando(null)}
            solicitudId={solicitud.id}
            avanceId={generando.id}
            clienteId={solicitud.cliente_id}
            numeroSolicitud={solicitud.numero}
            nombreSolicitud={solicitud.nombre}
            cliente={solicitud.cliente?.nombre ?? ''}
            tipoSolicitud={solicitud.tipo?.nombre ?? ''}
            equipo={solicitud.equipo}
            operador={operadorNombre}
            fecha={generando.creado_en}
            horasTrabajadas={Number(generando.horas_trabajadas)}
            narrativa={generando.narrativa}
            materiales={generando.solicitud_materiales.map((item) => ({
              nombre: item.material?.nombre ?? '',
              cantidad: Number(item.cantidad),
              unidad_medida: item.material?.unidad_medida ?? '',
            }))}
            fotosAdjuntas={generando.adjuntos.filter((adjunto) => adjunto.tipo === 'imagen')}
            reporte={{
              ...generando.reporte_atencion,
              checklist_notas: generando.reporte_atencion.checklist_notas ?? '',
              recomendaciones: generando.reporte_atencion.recomendaciones ?? '',
            }}
          />
        </Suspense>
      )}
    </section>
  )
}
