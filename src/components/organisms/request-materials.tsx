import { PackagePlus } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/atoms/button'
import { Input } from '@/components/atoms/input'
import { Select } from '@/components/atoms/select'
import { Skeleton } from '@/components/atoms/skeleton'
import { useCatalogo } from '@/features/catalogos/hooks/use-catalogo'
import type { Material } from '@/features/catalogos/types/catalogos.types'
import {
  useAgregarMaterialSolicitud,
  useMaterialesSolicitud,
} from '@/features/solicitudes/hooks/use-materiales-solicitud'

const moneda = new Intl.NumberFormat('es-CR', {
  style: 'currency',
  currency: 'CRC',
  maximumFractionDigits: 2,
})

export function RequestMaterials({ solicitudId }: { solicitudId: string }) {
  const { listado: catalogo } = useCatalogo<Material>('materiales')
  const asociados = useMaterialesSolicitud(solicitudId)
  const agregar = useAgregarMaterialSolicitud()
  const [materialId, setMaterialId] = useState('')
  const [cantidad, setCantidad] = useState('1')
  const [costo, setCosto] = useState('')

  function seleccionar(id: string) {
    setMaterialId(id)
    const material = catalogo.data?.find((item) => item.id === id)
    setCosto(material?.costo_referencial == null ? '' : String(material.costo_referencial))
  }

  async function guardar() {
    await agregar.mutateAsync({
      solicitud_id: solicitudId,
      material_id: materialId,
      cantidad: Number(cantidad),
      costo_referencial_aplicado: costo === '' ? null : Number(costo),
    })
    setMaterialId('')
    setCantidad('1')
    setCosto('')
  }

  const entradaValida =
    Boolean(materialId) && Number(cantidad) > 0 && (costo === '' || Number(costo) >= 0)

  return (
    <section className="space-y-4 rounded-xl border bg-muted/30 p-4">
      <div>
        <h3 className="flex items-center gap-2 font-semibold">
          <PackagePlus className="size-4 text-primary" />
          Inventario asociado
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Registre elementos de inventario previstos o entregados sin necesidad de crear un avance
          operativo.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(100px,0.7fr)_minmax(140px,1fr)_auto] sm:items-end">
        <label className="grid gap-2 text-sm font-medium">
          Material
          <Select value={materialId} onChange={(event) => seleccionar(event.target.value)}>
            <option value="">Seleccione…</option>
            {catalogo.data
              ?.filter((material) => material.activo)
              .map((material) => (
                <option key={material.id} value={material.id}>
                  {material.nombre} — {material.unidad_medida}
                </option>
              ))}
          </Select>
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Cantidad
          <Input
            type="number"
            min="0.001"
            step="0.001"
            value={cantidad}
            onChange={(event) => setCantidad(event.target.value)}
          />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Costo unitario
          <Input
            type="number"
            min="0"
            step="0.01"
            value={costo}
            onChange={(event) => setCosto(event.target.value)}
          />
        </label>
        <Button
          type="button"
          disabled={!entradaValida || agregar.isPending}
          onClick={() => void guardar()}
        >
          {agregar.isPending ? 'Agregando…' : 'Agregar'}
        </Button>
      </div>

      {(asociados.error ?? agregar.error) && (
        <p
          role="alert"
          className="rounded-md bg-destructive-soft p-3 text-sm text-destructive-soft-foreground"
        >
          {(asociados.error ?? agregar.error)?.message}
        </p>
      )}

      {asociados.isLoading ? (
        <div className="grid gap-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : asociados.data?.length ? (
        <ul className="divide-y rounded-lg border bg-card">
          {asociados.data.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm"
            >
              <span>
                <strong>{item.material?.nombre ?? 'Material'}</strong> · {item.cantidad}{' '}
                {item.material?.unidad_medida}
              </span>
              <span className="text-right text-muted-foreground">
                {item.costo_referencial_aplicado == null
                  ? 'Sin costo aplicado'
                  : `${moneda.format(item.costo_referencial_aplicado)} c/u · ${moneda.format(item.cantidad * item.costo_referencial_aplicado)}`}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-lg border bg-card p-3 text-sm text-muted-foreground">
          La solicitud todavía no tiene materiales asociados.
        </p>
      )}
    </section>
  )
}
