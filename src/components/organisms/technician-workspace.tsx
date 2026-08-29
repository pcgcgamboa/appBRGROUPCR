import { CalendarClock, MapPin, PackageCheck, Route, UserRound } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/atoms/badge'
import { Button } from '@/components/atoms/button'
import { Input } from '@/components/atoms/input'
import { Skeleton } from '@/components/atoms/skeleton'
import { DisclosurePanel } from '@/components/molecules/disclosure-panel'
import {
  useActualizarPerfilTecnico,
  useContextoSolicitudTecnico,
  useHerramientasTecnico,
  usePerfilTecnico,
} from '@/features/operador/hooks/use-operador'
import type { PerfilTecnico } from '@/features/operador/types/operador.types'
import { normalizarError } from '@/lib/errores'

function ProfileForm({ perfil }: { perfil: PerfilTecnico }) {
  const actualizar = useActualizarPerfilTecnico()
  const [nombre, setNombre] = useState(perfil.nombre_completo)
  const [telefono, setTelefono] = useState(perfil.telefono ?? '')

  async function guardar(event: FormEvent) {
    event.preventDefault()
    try {
      await actualizar.mutateAsync({ usuario_id: perfil.id, nombre_completo: nombre, telefono })
      toast.success('Perfil actualizado correctamente.')
    } catch (error) {
      toast.error(normalizarError(error).mensaje)
    }
  }

  return (
    <form className="grid gap-4 sm:grid-cols-2" onSubmit={guardar}>
      <label className="space-y-1 text-sm font-medium">
        Nombre completo
        <Input
          value={nombre}
          onChange={(event) => setNombre(event.target.value)}
          minLength={3}
          required
        />
      </label>
      <label className="space-y-1 text-sm font-medium">
        Teléfono personal
        <Input value={telefono} onChange={(event) => setTelefono(event.target.value)} />
      </label>
      <div className="sm:col-span-2">
        <Button disabled={actualizar.isPending} type="submit">
          {actualizar.isPending ? 'Guardando…' : 'Guardar información'}
        </Button>
      </div>
    </form>
  )
}

export function TechnicianSelfService({ usuarioId }: { usuarioId: string }) {
  const perfil = usePerfilTecnico(usuarioId)
  const herramientas = useHerramientasTecnico(usuarioId)
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <DisclosurePanel
        title="Mi información"
        description="Consulte y actualice sus datos personales."
        icon={UserRound}
      >
        {perfil.isLoading && <Skeleton className="h-28 w-full" />}
        {perfil.error && <p role="alert">{normalizarError(perfil.error).mensaje}</p>}
        {perfil.data && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted">
                {perfil.data.foto_url ? (
                  <img
                    src={perfil.data.foto_url}
                    alt={`Fotografía de ${perfil.data.nombre_completo}`}
                    className="size-full object-cover"
                  />
                ) : (
                  <UserRound className="size-6 text-muted-foreground" />
                )}
              </span>
              <p className="text-sm text-muted-foreground">
                La fotografía se administra desde el menú de la cuenta.
              </p>
            </div>
            <ProfileForm
              key={`${perfil.data.nombre_completo}-${perfil.data.telefono ?? ''}`}
              perfil={perfil.data}
            />
          </div>
        )}
      </DisclosurePanel>
      <DisclosurePanel
        title="Artículos asignados"
        description="Herramientas actualmente bajo su custodia."
        icon={PackageCheck}
      >
        {herramientas.isLoading && <Skeleton className="h-28 w-full" />}
        {herramientas.error && <p role="alert">{normalizarError(herramientas.error).mensaje}</p>}
        {!herramientas.isLoading && !herramientas.data?.length && (
          <p className="text-sm text-muted-foreground">No tiene artículos asignados.</p>
        )}
        <ul className="space-y-3">
          {herramientas.data?.map((asignacion) => (
            <li key={asignacion.id} className="rounded-lg border bg-muted/20 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium">
                  {asignacion.herramienta?.nombre ?? 'Herramienta'}
                </span>
                <Badge>{asignacion.herramienta?.numero_activo ?? 'Sin activo'}</Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Asignada el {new Date(asignacion.asignada_en).toLocaleDateString('es-CR')}
              </p>
              {asignacion.observaciones_entrega && (
                <p className="mt-2 text-sm">{asignacion.observaciones_entrega}</p>
              )}
            </li>
          ))}
        </ul>
      </DisclosurePanel>
    </div>
  )
}

export function TechnicianRequestContext({ solicitudId }: { solicitudId: string }) {
  const contexto = useContextoSolicitudTecnico(solicitudId)
  if (contexto.isLoading) return <Skeleton className="h-48 w-full" />
  if (contexto.error)
    return (
      <p role="alert" className="rounded-lg bg-destructive-soft p-3 text-sm">
        {normalizarError(contexto.error).mensaje}
      </p>
    )
  if (!contexto.data) return null
  const { ubicacion, ruta, eventos } = contexto.data
  return (
    <DisclosurePanel
      title="Contexto operativo"
      description="Encargado, ubicación y eventos relacionados con su atención."
      icon={Route}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-3 rounded-lg border p-4">
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">Cliente</p>
            <p className="font-medium">{contexto.data.cliente}</p>
            <p className="text-xs text-muted-foreground">
              Los datos de contacto del cliente están protegidos.
            </p>
          </div>
          <div className="flex gap-2">
            <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
            <div className="text-sm">
              <p className="font-medium">{ubicacion.nombre}</p>
              <p>{`${ubicacion.provincia}, ${ubicacion.canton}, ${ubicacion.distrito}`}</p>
              {ubicacion.otras_senas && <p>{ubicacion.otras_senas}</p>}
            </div>
          </div>
          {ruta ? (
            <div className="space-y-1 border-t pt-3 text-sm">
              <p>
                <span className="font-medium">Encargado:</span> {ruta.encargado}
              </p>
              <p>
                <span className="font-medium">Ruta:</span> {ruta.codigo} · {ruta.nombre}
              </p>
              <p>
                <span className="font-medium">Fecha:</span>{' '}
                {new Date(`${ruta.fecha_programada}T00:00:00`).toLocaleDateString('es-CR')}
              </p>
            </div>
          ) : (
            <p className="border-t pt-3 text-sm text-warning">Ruta aún no programada.</p>
          )}
        </div>
        <div>
          <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <CalendarClock className="size-4 text-primary" /> Eventos relacionados
          </h4>
          {!eventos.length && (
            <p className="text-sm text-muted-foreground">No hay eventos de ruta registrados.</p>
          )}
          <ol className="max-h-72 space-y-3 overflow-y-auto pr-1">
            {eventos.map((evento) => (
              <li key={evento.id} className="rounded-lg border p-3 text-sm">
                <div className="flex flex-wrap justify-between gap-2">
                  <span className="font-medium">{evento.titulo}</span>
                  <Badge>{evento.tipo}</Badge>
                </div>
                {evento.descripcion && <p className="mt-1">{evento.descripcion}</p>}
                <time className="mt-1 block text-xs text-muted-foreground">
                  {new Date(evento.creado_en).toLocaleString('es-CR')}
                </time>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </DisclosurePanel>
  )
}
