import { PackagePlus, Trash2 } from 'lucide-react'
import { type FormEvent, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/atoms/button'
import { Input } from '@/components/atoms/input'
import { Select } from '@/components/atoms/select'
import { Textarea } from '@/components/atoms/textarea'
import { PhotoAttachmentPicker } from '@/components/molecules/photo-attachment-picker'
import { useCatalogo } from '@/features/catalogos/hooks/use-catalogo'
import type { Material } from '@/features/catalogos/types/catalogos.types'
import { useAttachmentUploads } from '@/features/operador/hooks/use-attachment-uploads'
import {
  descartarAvanceDraft,
  leerAvanceDraft,
  useGuardarAvanceDraft,
} from '@/features/operador/hooks/use-avance-draft'
import { useAvancesSolicitud, useRegistrarAvance } from '@/features/operador/hooks/use-operador'
import type {
  MaterialAvanceInput,
  SolicitudOperador,
} from '@/features/operador/types/operador.types'
import type { EstadoSolicitud } from '@/features/solicitudes/types/solicitudes.types'
import { useNetworkStatus } from '@/hooks/use-network-status'
import { normalizarError } from '@/lib/errores'
import { useI18n } from '@/lib/i18n'

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
  onCancel,
}: {
  solicitud: SolicitudOperador
  onSaved: () => void
  onCancel: () => void
}) {
  const { listado: catalogo } = useCatalogo<Material>('materiales')
  const registrar = useRegistrarAvance()
  const avances = useAvancesSolicitud(solicitud.id)
  const attachmentUploads = useAttachmentUploads()
  const { isOnline } = useNetworkStatus()
  const { t } = useI18n()

  const [horas, setHoras] = useState('1')
  const [porcentaje, setPorcentaje] = useState('0')
  const [narrativa, setNarrativa] = useState('')
  const [estado, setEstado] = useState<EstadoSolicitud>(
    estadosPorActual[solicitud.estado]?.[0] ?? 'en_atencion',
  )
  const [materiales, setMateriales] = useState<MaterialAvanceInput[]>([])
  const [borradorRestaurado, setBorradorRestaurado] = useState(false)
  const [fotosPendientesDelBorrador, setFotosPendientesDelBorrador] = useState(0)

  // Hidrata desde el borrador local al abrir una solicitud; si no hay borrador, vuelve a
  // los valores por defecto en vez de arrastrar los de la solicitud vista anteriormente.
  useEffect(() => {
    const draft = leerAvanceDraft(solicitud.id)
    if (draft) {
      setHoras(draft.horas)
      setPorcentaje(draft.porcentaje)
      setEstado(draft.estado)
      setNarrativa(draft.narrativa)
      setMateriales(draft.materiales.map((item) => ({ ...item, key: crypto.randomUUID() })))
      setBorradorRestaurado(true)
      setFotosPendientesDelBorrador(draft.archivosSeleccionadosCount)
    } else {
      setHoras('1')
      setPorcentaje('0')
      setEstado(estadosPorActual[solicitud.estado]?.[0] ?? 'en_atencion')
      setNarrativa('')
      setMateriales([])
      setBorradorRestaurado(false)
      setFotosPendientesDelBorrador(0)
    }
  }, [solicitud])

  // El porcentaje nunca puede quedar por debajo del máximo ya confirmado en el historial,
  // incluso si el borrador restaurado o el valor previo eran menores.
  useEffect(() => {
    const maximo = Math.max(0, ...(avances.data?.map((avance) => avance.porcentaje) ?? []))
    setPorcentaje((actual) => String(Math.max(Number(actual) || 0, maximo)))
  }, [avances.data, solicitud.id])

  useEffect(() => {
    if (estado === 'atendida') setPorcentaje('100')
  }, [estado])

  // Sube automáticamente cualquier adjunto pendiente o reintentado, sin bloquear al usuario
  // en el resto del formulario mientras la subida ocurre en segundo plano.
  useEffect(() => {
    const hayPendientes = attachmentUploads.items.some((item) => item.estado === 'pendiente')
    if (hayPendientes && !attachmentUploads.isUploading)
      void attachmentUploads.uploadAll(solicitud.id)
  }, [attachmentUploads, solicitud.id])

  // Limpieza best-effort: si se cambia de solicitud (o se desmonta) con fotos ya subidas
  // pero sin guardar el avance, se intentan retirar del bucket para reducir huérfanos.
  const cancelarUploadsRef = useRef(attachmentUploads.cancelar)
  cancelarUploadsRef.current = attachmentUploads.cancelar
  useEffect(() => {
    return () => {
      void cancelarUploadsRef.current()
    }
  }, [solicitud.id])

  useGuardarAvanceDraft(solicitud.id, {
    horas,
    porcentaje,
    estado,
    narrativa,
    materiales,
    archivosSeleccionadosCount: attachmentUploads.items.filter((item) => item.estado !== 'listo')
      .length,
  })

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

  function descartarBorrador() {
    descartarAvanceDraft(solicitud.id)
    setHoras('1')
    setPorcentaje('0')
    setEstado(estadosPorActual[solicitud.estado]?.[0] ?? 'en_atencion')
    setNarrativa('')
    setMateriales([])
    setBorradorRestaurado(false)
    setFotosPendientesDelBorrador(0)
  }

  function cancelar() {
    void attachmentUploads.cancelar()
    onCancel()
  }

  async function enviar(event: FormEvent) {
    event.preventDefault()
    if (!isOnline || !attachmentUploads.allReady) return
    try {
      await registrar.mutateAsync({
        solicitud_id: solicitud.id,
        horas_trabajadas: Number(horas),
        porcentaje: Number(porcentaje),
        narrativa,
        estado_nuevo: estado,
        materiales,
        adjuntos: attachmentUploads.adjuntosParaEnviar(),
      })
      descartarAvanceDraft(solicitud.id)
      attachmentUploads.reset()
      setNarrativa('')
      setMateriales([])
      setBorradorRestaurado(false)
      toast.success(t('avanceSaved'))
      onSaved()
    } catch {
      // El error ya queda expuesto abajo vía registrar.error.
    }
  }

  const bloqueadoPorVehiculo = !solicitud.ruta?.vehiculo_id
  const bloqueadoPorAdjuntos = !attachmentUploads.allReady
  const deshabilitado =
    registrar.isPending || !isOnline || bloqueadoPorVehiculo || bloqueadoPorAdjuntos

  let mensajeFooter: string | null = null
  if (!isOnline) mensajeFooter = t('offlineSubmitBlocked')
  else if (attachmentUploads.isUploading) mensajeFooter = t('uploadingPhotosStatus')
  else if (bloqueadoPorAdjuntos) mensajeFooter = t('photosPendingBlocked')
  else if (bloqueadoPorVehiculo) mensajeFooter = t('vehicleMissingBlocked')

  return (
    <form onSubmit={enviar} className="space-y-6 rounded-lg border bg-card p-4 shadow-sm sm:p-6">
      <div>
        <h2 className="text-lg font-semibold">Registrar avance</h2>
        <p className="text-sm text-muted-foreground">
          Vehículo:{' '}
          {solicitud.ruta?.vehiculo
            ? `${solicitud.ruta.vehiculo.placa} — ${solicitud.ruta.vehiculo.tipo}`
            : 'Ruta sin vehículo'}
        </p>
      </div>

      {borradorRestaurado && (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-primary-soft p-3 text-sm text-primary-soft-foreground"
        >
          <p>
            {t('draftRestored')}
            {fotosPendientesDelBorrador > 0 &&
              ` ${t('draftPendingPhotosPrefix')} ${fotosPendientesDelBorrador} ${t('draftPendingPhotosSuffix')}`}
          </p>
          <Button type="button" variant="outline" size="sm" onClick={descartarBorrador}>
            {t('discardDraft')}
          </Button>
        </div>
      )}

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
              className="w-fit text-destructive hover:bg-destructive-soft sm:col-span-2"
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

      <PhotoAttachmentPicker
        items={attachmentUploads.items}
        onAddFiles={attachmentUploads.addFiles}
        onRemove={attachmentUploads.removeFile}
        onRetry={attachmentUploads.retryFile}
        listosCount={attachmentUploads.listosCount}
        totalCount={attachmentUploads.totalCount}
        disabled={registrar.isPending}
      />

      {registrar.error && (
        <p
          role="alert"
          className="rounded-md bg-destructive-soft p-3 text-sm text-destructive-soft-foreground"
        >
          {normalizarError(registrar.error).mensaje}
        </p>
      )}

      <div className="sticky bottom-0 -mx-4 -mb-4 mt-2 rounded-b-lg border-t bg-card/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:-mb-6 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {mensajeFooter ? (
            <p
              role={!isOnline || bloqueadoPorAdjuntos ? 'alert' : 'status'}
              className="text-sm text-muted-foreground"
            >
              {mensajeFooter}
            </p>
          ) : (
            <span />
          )}
          <div className="ml-auto flex gap-2">
            <Button type="button" variant="outline" onClick={cancelar}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={deshabilitado}>
              {registrar.isPending ? t('savingProgress') : t('saveProgress')}
            </Button>
          </div>
        </div>
      </div>
    </form>
  )
}
