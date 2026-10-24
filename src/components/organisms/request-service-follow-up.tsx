import { toast } from 'sonner'
import { type FormEvent, useState } from 'react'
import { Button } from '@/components/atoms/button'
import { Input } from '@/components/atoms/input'
import { Select } from '@/components/atoms/select'
import { Textarea } from '@/components/atoms/textarea'
import {
  useAgregarGarantia,
  useProgramarVisita,
  useSeguimientoSolicitud,
} from '@/features/seguimiento/hooks/use-seguimiento'
import { normalizarError } from '@/lib/errores'

export function RequestServiceFollowUp({
  solicitudId,
  modo,
}: {
  solicitudId: string
  modo: 'cliente' | 'gestor'
}) {
  const seguimiento = useSeguimientoSolicitud(solicitudId)
  const garantia = useAgregarGarantia()
  const visita = useProgramarVisita()
  const [detalle, setDetalle] = useState('')
  const [tipo, setTipo] = useState<'informacion' | 'resolucion'>('informacion')
  const [llegada, setLlegada] = useState('')
  const [indicaciones, setIndicaciones] = useState('')
  const vigente = Boolean(
    seguimiento.data?.garantia_vence_en &&
    new Date(seguimiento.data.garantia_vence_en) >= new Date(),
  )

  async function guardarGarantia(event: FormEvent) {
    event.preventDefault()
    await garantia.mutateAsync({
      solicitud_id: solicitudId,
      tipo: modo === 'cliente' ? 'solicitud_atencion' : tipo,
      detalle,
    })
    setDetalle('')
    toast.success('Interacción de garantía registrada.')
  }
  async function guardarVisita(event: FormEvent) {
    event.preventDefault()
    await visita.mutateAsync({
      solicitud_id: solicitudId,
      llegada_estimada: new Date(llegada).toISOString(),
      indicaciones,
    })
    setLlegada('')
    setIndicaciones('')
    toast.success('Visita programada.')
  }

  if (seguimiento.isLoading)
    return <p className="text-sm text-muted-foreground">Cargando seguimiento…</p>
  return (
    <div className="space-y-5">
      <section className="space-y-3 rounded-md border p-4">
        <h3 className="font-semibold">Garantía</h3>
        {seguimiento.data?.garantia_vence_en ? (
          <p className="text-sm">
            Vigencia hasta {new Date(seguimiento.data.garantia_vence_en).toLocaleString('es-CR')} ·{' '}
            {vigente ? 'Vigente' : 'Vencida'}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            La garantía inicia cuando el proveedor cierra la solicitud.
          </p>
        )}
        {(modo === 'gestor' || vigente) && (
          <form onSubmit={guardarGarantia} className="grid gap-3">
            {modo === 'gestor' && (
              <Select value={tipo} onChange={(e) => setTipo(e.target.value as typeof tipo)}>
                <option value="informacion">Agregar información</option>
                <option value="resolucion">Registrar resolución</option>
              </Select>
            )}
            <Textarea
              required
              placeholder={
                modo === 'cliente'
                  ? 'Describa la atención requerida con base en la garantía.'
                  : 'Información técnica o resolución de la garantía.'
              }
              value={detalle}
              onChange={(e) => setDetalle(e.target.value)}
            />
            <Button className="w-fit" disabled={garantia.isPending || !detalle.trim()}>
              {garantia.isPending
                ? 'Guardando…'
                : modo === 'cliente'
                  ? 'Solicitar atención por garantía'
                  : 'Agregar a garantía'}
            </Button>
          </form>
        )}
        <div className="space-y-2">
          {seguimiento.data?.interacciones.map((item) => (
            <div key={item.id} className="rounded-md bg-muted/40 p-3 text-sm">
              <p className="font-medium">
                {item.autor?.nombre_completo ?? 'Usuario'} · {item.tipo.replace(/_/g, ' ')}
              </p>
              <p>{item.detalle}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(item.creado_en).toLocaleString('es-CR')}
              </p>
            </div>
          ))}
        </div>
      </section>
      <section className="space-y-3 rounded-md border p-4">
        <h3 className="font-semibold">Llegada y equipo de atención</h3>
        {modo === 'gestor' && (
          <form onSubmit={guardarVisita} className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium">
              Hora estimada
              <Input
                required
                type="datetime-local"
                value={llegada}
                onChange={(e) => setLlegada(e.target.value)}
              />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Indicaciones
              <Input value={indicaciones} onChange={(e) => setIndicaciones(e.target.value)} />
            </label>
            <Button className="w-fit" disabled={visita.isPending || !llegada}>
              Informar llegada
            </Button>
          </form>
        )}
        {seguimiento.data?.visitas[0] ? (
          <p className="rounded-md bg-primary-soft p-3 text-sm text-primary-soft-foreground">
            Próxima llegada informada:{' '}
            {new Date(seguimiento.data.visitas[0].llegada_estimada).toLocaleString('es-CR')}
            {seguimiento.data.visitas[0].indicaciones
              ? ` · ${seguimiento.data.visitas[0].indicaciones}`
              : ''}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Todavía no se ha informado una hora de llegada.
          </p>
        )}
        <div className="grid gap-2 sm:grid-cols-2">
          {seguimiento.data?.equipo.map((persona) => (
            <div key={persona.usuario_id} className="flex items-center gap-3 rounded-md border p-3">
              {persona.usuario?.foto_url ? (
                <img
                  src={persona.usuario.foto_url}
                  alt=""
                  className="size-11 rounded-full object-cover"
                />
              ) : (
                <div className="size-11 rounded-full bg-muted" />
              )}
              <span className="text-sm font-medium">
                {persona.usuario?.nombre_completo ?? 'Persona asignada'}
              </span>
            </div>
          ))}
        </div>
      </section>
      {(seguimiento.error ?? garantia.error ?? visita.error) && (
        <p
          role="alert"
          className="rounded-md bg-destructive-soft p-3 text-sm text-destructive-soft-foreground"
        >
          {normalizarError(seguimiento.error ?? garantia.error ?? visita.error).mensaje}
        </p>
      )}
    </div>
  )
}
