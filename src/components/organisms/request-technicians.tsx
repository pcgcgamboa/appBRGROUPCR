import { toast } from 'sonner'
import { Checkbox } from '@/components/atoms/checkbox'
import { Skeleton } from '@/components/atoms/skeleton'
import {
  useAsignarTecnicos,
  useTecnicosSolicitud,
} from '@/features/tecnicos/hooks/use-tecnicos-solicitud'
import { normalizarError } from '@/lib/errores'

// Cada casilla se guarda al marcarla/desmarcarla. Antes la selección vivía en estado local hasta
// pulsar "Guardar técnicos", y se perdía al cambiar de pestaña (el contenido se desmonta) o al
// refrescarse la consulta (un efecto la reemplazaba por lo guardado).
export function RequestTechnicians({ solicitudId }: { solicitudId: string }) {
  const datos = useTecnicosSolicitud(solicitudId)
  const asignar = useAsignarTecnicos()
  const asignados = datos.data?.asignados ?? []

  function toggle(id: string, nombre: string, checked: boolean) {
    const tecnicos = checked ? [...asignados, id] : asignados.filter((x) => x !== id)
    asignar.mutate(
      { solicitudId, tecnicos },
      {
        onSuccess: () =>
          toast.success(checked ? `${nombre} asignado a la solicitud.` : `${nombre} retirado.`),
      },
    )
  }

  return (
    <section className="space-y-3 rounded-lg border bg-muted/30 p-4">
      <div>
        <h3 className="font-semibold">Técnicos de la solicitud</h3>
        <p className="text-xs text-muted-foreground">
          Asigne albañiles, soldadores o choferes requeridos. Los cambios se guardan al marcar o
          desmarcar.
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {datos.isLoading
          ? Array.from({ length: 2 }).map((_, index) => (
              <Skeleton key={index} className="h-14 w-full" />
            ))
          : datos.data?.tecnicos.map((t) => (
              <label
                key={t.id}
                className="flex min-h-11 items-center gap-2 rounded-md border bg-card p-2 text-sm"
              >
                <Checkbox
                  checked={asignados.includes(t.id)}
                  disabled={asignar.isPending}
                  onCheckedChange={(checked) => toggle(t.id, t.nombre_completo, checked === true)}
                />
                <span>
                  <strong>{t.nombre_completo}</strong>
                  <br />
                  <span className="text-xs text-muted-foreground">
                    {t.especialidad} · {t.celular}
                  </span>
                </span>
              </label>
            ))}
        {!datos.isLoading && !datos.data?.tecnicos.length && (
          <p className="text-sm text-muted-foreground">No hay técnicos activos registrados.</p>
        )}
      </div>
      {(datos.error || asignar.error) && (
        <p
          role="alert"
          className="rounded-md bg-destructive-soft p-3 text-sm text-destructive-soft-foreground"
        >
          {normalizarError(datos.error ?? asignar.error).mensaje}
        </p>
      )}
    </section>
  )
}
