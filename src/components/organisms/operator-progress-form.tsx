import { Camera, PackagePlus, Trash2 } from 'lucide-react'
import { type FormEvent, useEffect, useState } from 'react'
import { Button } from '@/components/atoms/button'
import { Input } from '@/components/atoms/input'
import { Select } from '@/components/atoms/select'
import { Textarea } from '@/components/atoms/textarea'
import { useCatalogo } from '@/features/catalogos/hooks/use-catalogo'
import type { Material } from '@/features/catalogos/types/catalogos.types'
import { useAvancesSolicitud, useRegistrarAvance } from '@/features/operador/hooks/use-operador'
import type {
  MaterialAvanceInput,
  SolicitudOperador,
} from '@/features/operador/types/operador.types'
import type { EstadoSolicitud } from '@/features/solicitudes/types/solicitudes.types'

function materialVacio(): MaterialAvanceInput {
  return {
    key: crypto.randomUUID(),
    material_id: '',
    nombre: '',
    descripcion: '',
    unidad_medida: '',
    cantidad: '1',
    costo_referencial: '',
  }
}

const estadosPorActual: Partial<Record<EstadoSolicitud, EstadoSolicitud[]>> = {
  asignada: ['en_atencion'],
  en_atencion: ['en_atencion', 'en_espera_materiales', 'atendida'],
  en_espera_materiales: ['en_espera_materiales', 'en_atencion', 'atendida'],
}

export function OperatorProgressForm({
  solicitud,
  onSaved,
}: {
  solicitud: SolicitudOperador
  onSaved: () => void
}) {
  const { listado: catalogo } = useCatalogo<Material>('materiales')
  const registrar = useRegistrarAvance()
  const avances = useAvancesSolicitud(solicitud.id)
  const [horas, setHoras] = useState('1')
  const [porcentaje, setPorcentaje] = useState('0')
  const [narrativa, setNarrativa] = useState('')
  const [estado, setEstado] = useState<EstadoSolicitud>(
    estadosPorActual[solicitud.estado]?.[0] ?? 'en_atencion',
  )
  const [materiales, setMateriales] = useState<MaterialAvanceInput[]>([])
  const [archivos, setArchivos] = useState<File[]>([])

  useEffect(() => {
    setEstado(estadosPorActual[solicitud.estado]?.[0] ?? 'en_atencion')
  }, [solicitud])
  useEffect(() => {
    const maximo = Math.max(0, ...(avances.data?.map((avance) => avance.porcentaje) ?? []))
    setPorcentaje(String(maximo))
  }, [avances.data, solicitud.id])
  useEffect(() => {
    if (estado === 'atendida') setPorcentaje('100')
  }, [estado])

  function actualizarMaterial(key: string, changes: Partial<MaterialAvanceInput>) {
    setMateriales((current) =>
      current.map((item) => (item.key === key ? { ...item, ...changes } : item)),
    )
  }

  function seleccionarMaterial(item: MaterialAvanceInput, value: string) {
    if (value === '__nuevo')
      actualizarMaterial(item.key, {
        material_id: '',
        nombre: '',
        descripcion: '',
        unidad_medida: '',
        costo_referencial: '',
      })
    else {
      const material = catalogo.data?.find((option) => option.id === value)
      if (material)
        actualizarMaterial(item.key, {
          material_id: material.id,
          nombre: material.nombre,
          descripcion: material.descripcion ?? '',
          unidad_medida: material.unidad_medida,
          costo_referencial: String(material.costo_referencial ?? ''),
        })
    }
  }

  async function enviar(event: FormEvent) {
    event.preventDefault()
    await registrar.mutateAsync({
      solicitud_id: solicitud.id,
      horas_trabajadas: Number(horas),
      porcentaje: Number(porcentaje),
      narrativa,
      estado_nuevo: estado,
      materiales,
      archivos,
    })
    setNarrativa('')
    setMateriales([])
    setArchivos([])
    onSaved()
  }

  return (
    <form onSubmit={enviar} className="space-y-6 rounded-lg border bg-white p-4 shadow-sm sm:p-6">
      <div>
        <h2 className="text-lg font-semibold">Registrar avance</h2>
        <p className="text-sm text-muted-foreground">
          Vehículo:{' '}
          {solicitud.ruta?.vehiculo
            ? `${solicitud.ruta.vehiculo.placa} — ${solicitud.ruta.vehiculo.tipo}`
            : 'Ruta sin vehículo'}
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="grid gap-2 text-sm font-medium">
          Horas trabajadas
          <Input
            type="number"
            min="0.25"
            max="24"
            step="0.25"
            required
            value={horas}
            onChange={(event) => setHoras(event.target.value)}
          />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Avance (%)
          <Input
            type="number"
            min="0"
            max="100"
            required
            value={porcentaje}
            disabled={estado === 'atendida'}
            onChange={(event) => setPorcentaje(event.target.value)}
          />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Estado
          <Select
            value={estado}
            onChange={(event) => setEstado(event.target.value as EstadoSolicitud)}
          >
            {estadosPorActual[solicitud.estado]?.map((item) => (
              <option key={item} value={item}>
                {item.replace(/_/g, ' ')}
              </option>
            ))}
          </Select>
        </label>
      </div>
      <label className="grid gap-2 text-sm font-medium">
        Bitácora narrativa
        <Textarea
          required
          minLength={5}
          value={narrativa}
          onChange={(event) => setNarrativa(event.target.value)}
          placeholder="Describa el trabajo realizado, hallazgos y pendientes…"
        />
      </label>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-semibold">Materiales utilizados</h3>
          <Button
            type="button"
            variant="outline"
            onClick={() => setMateriales((current) => [...current, materialVacio()])}
          >
            <PackagePlus className="mr-2 size-4" />
            Agregar
          </Button>
        </div>
        {materiales.map((item) => (
          <div key={item.key} className="grid gap-3 rounded-lg border p-3 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium sm:col-span-2">
              Material
              <Select
                value={item.material_id || '__nuevo'}
                onChange={(event) => seleccionarMaterial(item, event.target.value)}
              >
                <option value="__nuevo">Nuevo material libre</option>
                {catalogo.data
                  ?.filter((material) => material.activo)
                  .map((material) => (
                    <option key={material.id} value={material.id}>
                      {material.nombre} — {material.unidad_medida}
                    </option>
                  ))}
              </Select>
            </label>
            {!item.material_id && (
              <>
                <label className="grid gap-2 text-sm font-medium">
                  Nombre
                  <Input
                    required
                    value={item.nombre}
                    onChange={(event) =>
                      actualizarMaterial(item.key, { nombre: event.target.value })
                    }
                  />
                </label>
                <label className="grid gap-2 text-sm font-medium">
                  Unidad de medida
                  <Input
                    required
                    value={item.unidad_medida}
                    onChange={(event) =>
                      actualizarMaterial(item.key, { unidad_medida: event.target.value })
                    }
                  />
                </label>
                <label className="grid gap-2 text-sm font-medium sm:col-span-2">
                  Descripción
                  <Input
                    value={item.descripcion}
                    onChange={(event) =>
                      actualizarMaterial(item.key, { descripcion: event.target.value })
                    }
                  />
                </label>
              </>
            )}
            <label className="grid gap-2 text-sm font-medium">
              Cantidad
              <Input
                type="number"
                min="0.001"
                step="0.001"
                required
                value={item.cantidad}
                onChange={(event) => actualizarMaterial(item.key, { cantidad: event.target.value })}
              />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Costo referencial
              <Input
                type="number"
                min="0"
                step="0.01"
                value={item.costo_referencial}
                onChange={(event) =>
                  actualizarMaterial(item.key, { costo_referencial: event.target.value })
                }
              />
            </label>
            <Button
              type="button"
              variant="outline"
              className="w-fit text-red-700 sm:col-span-2"
              onClick={() =>
                setMateriales((current) => current.filter((material) => material.key !== item.key))
              }
            >
              <Trash2 className="mr-2 size-4" />
              Quitar material
            </Button>
          </div>
        ))}
      </section>

      <label className="grid gap-2 text-sm font-medium">
        <span className="flex items-center gap-2">
          <Camera className="size-4" />
          Fotos o documentos
        </span>
        <Input
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,application/pdf"
          capture="environment"
          onChange={(event) => setArchivos(Array.from(event.target.files ?? []))}
        />
        <span className="text-xs font-normal text-muted-foreground">
          Puede tomar fotografías directamente desde el teléfono. Máximo 10 MB por archivo.
        </span>
      </label>
      {registrar.error && (
        <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800">
          {registrar.error.message}
        </p>
      )}
      <Button type="submit" disabled={registrar.isPending || !solicitud.ruta?.vehiculo_id}>
        {registrar.isPending ? 'Registrando…' : 'Guardar avance'}
      </Button>
    </form>
  )
}
