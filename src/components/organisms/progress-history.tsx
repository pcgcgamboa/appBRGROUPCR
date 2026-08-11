import { Badge } from '@/components/atoms/badge'
import { useAvancesSolicitud } from '@/features/operador/hooks/use-operador'

export function ProgressHistory({ solicitudId }: { solicitudId: string }) {
  const avances = useAvancesSolicitud(solicitudId)
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">Bitácora registrada</h2>
      {avances.data?.length ? (
        avances.data.map((avance) => (
          <article key={avance.id} className="rounded-lg border bg-white p-4 shadow-sm">
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
          </article>
        ))
      ) : (
        <p className="rounded-lg border bg-white p-4 text-sm text-muted-foreground">
          Todavía no hay avances registrados.
        </p>
      )}
    </section>
  )
}
