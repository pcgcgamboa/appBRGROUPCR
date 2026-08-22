import { useEffect, useState } from 'react'
import { Button } from '@/components/atoms/button'
import { Checkbox } from '@/components/atoms/checkbox'
import {
  useAsignarTecnicos,
  useTecnicosSolicitud,
} from '@/features/tecnicos/hooks/use-tecnicos-solicitud'
export function RequestTechnicians({ solicitudId }: { solicitudId: string }) {
  const datos = useTecnicosSolicitud(solicitudId)
  const asignar = useAsignarTecnicos()
  const [seleccionados, setSeleccionados] = useState<string[]>([])
  useEffect(() => setSeleccionados(datos.data?.asignados ?? []), [datos.data])
  const toggle = (id: string, checked: boolean) =>
    setSeleccionados((v) => (checked ? [...v, id] : v.filter((x) => x !== id)))
  return (
    <section className="space-y-3 rounded-lg border bg-muted/30 p-4">
      <div>
        <h3 className="font-semibold">Técnicos de la solicitud</h3>
        <p className="text-xs text-muted-foreground">
          Asigne albañiles, soldadores o choferes requeridos.
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {datos.data?.tecnicos.map((t) => (
          <label
            key={t.id}
            className="flex items-center gap-2 rounded-md border bg-card p-2 text-sm"
          >
            <Checkbox
              checked={seleccionados.includes(t.id)}
              onCheckedChange={(checked) => toggle(t.id, checked === true)}
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
      </div>
      {(datos.error || asignar.error) && (
        <p role="alert" className="rounded-md bg-destructive-soft p-3 text-sm text-destructive-soft-foreground">
          {(datos.error || asignar.error)?.message}
        </p>
      )}
      <Button
        type="button"
        disabled={asignar.isPending}
        onClick={() => void asignar.mutateAsync({ solicitudId, tecnicos: seleccionados })}
      >
        {asignar.isPending ? 'Guardando…' : 'Guardar técnicos'}
      </Button>
    </section>
  )
}
