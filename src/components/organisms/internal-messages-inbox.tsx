import { ArrowLeft, Send, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Badge } from '@/components/atoms/badge'
import { Button } from '@/components/atoms/button'
import { Select } from '@/components/atoms/select'
import { Skeleton } from '@/components/atoms/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/atoms/tabs'
import { InternalMessagesThread } from '@/components/organisms/internal-messages-thread'
import { usePerfilActual } from '@/features/auth/hooks/use-perfil-actual'
import { useSession } from '@/features/auth/hooks/use-session'
import {
  useConversacionesDirectas,
  useEnviarMensaje,
  useMarcarMensajeLeido,
  useMensajesConContraparte,
  useMensajesDifusion,
} from '@/features/mensajeria/hooks/use-mensajeria'
import { useDirectorioStaff } from '@/features/usuarios/hooks/use-directorio-staff'
import type { RolStaff } from '@/features/usuarios/types/usuarios.types'

const ETIQUETA_ROL: Record<RolStaff, string> = {
  administrador: 'Administradores',
  encargado: 'Encargados',
  operador: 'Operadores',
}

export function InternalMessagesInbox() {
  const { session } = useSession()
  const usuarioId = session?.user.id
  const perfil = usePerfilActual(usuarioId)
  const esGestor = Boolean(
    perfil.data?.roles.some((rol) => rol === 'administrador' || rol === 'encargado'),
  )

  const [contraparteId, setContraparteId] = useState<string>()
  const [nuevoDestinatarioId, setNuevoDestinatarioId] = useState('')
  const [rolDifusion, setRolDifusion] = useState<RolStaff>('operador')

  const directorio = useDirectorioStaff()
  const conversaciones = useConversacionesDirectas()
  const hilo = useMensajesConContraparte(contraparteId)
  const difusiones = useMensajesDifusion()
  const enviar = useEnviarMensaje()
  const marcarLeido = useMarcarMensajeLeido()

  useEffect(() => {
    if (!usuarioId) return
    for (const mensaje of hilo.mensajes) {
      if (
        mensaje.remitente_id !== usuarioId &&
        !mensaje.lecturas.some((lectura) => lectura.usuario_id === usuarioId)
      ) {
        void marcarLeido.mutateAsync(mensaje.id)
      }
    }
  }, [hilo.mensajes, usuarioId, marcarLeido])

  const nombreContraparteActual =
    directorio.data?.find((persona) => persona.id === contraparteId)?.nombre_completo ??
    conversaciones.conversaciones.find((c) => c.contraparteId === contraparteId)
      ?.contraparteNombre ??
    'Usuario'

  const candidatosNuevaConversacion = (directorio.data ?? []).filter(
    (persona) =>
      persona.id !== usuarioId &&
      !conversaciones.conversaciones.some((c) => c.contraparteId === persona.id),
  )

  return (
    <Tabs defaultValue="directos" className="flex h-full min-h-0 flex-col">
      <TabsList>
        <TabsTrigger value="directos">Directos</TabsTrigger>
        <TabsTrigger value="equipo">
          <Users className="mr-2 size-4" />
          Equipo
        </TabsTrigger>
      </TabsList>

      <TabsContent value="directos" className="flex min-h-0 flex-1 flex-col">
        {contraparteId ? (
          <div className="flex min-h-0 flex-1 flex-col gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="w-fit"
              onClick={() => setContraparteId(undefined)}
            >
              <ArrowLeft className="mr-2 size-4" />
              {nombreContraparteActual}
            </Button>
            <InternalMessagesThread
              mensajes={hilo.mensajes}
              isLoading={hilo.isLoading}
              error={hilo.error}
              usuarioActualId={usuarioId}
              enviando={enviar.isPending}
              onEnviar={(cuerpo) => enviar.mutateAsync({ destinatarioId: contraparteId, cuerpo })}
            />
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col gap-4">
            <label className="grid gap-2 text-sm font-medium">
              Nueva conversación
              <div className="flex gap-2">
                <Select
                  value={nuevoDestinatarioId}
                  onChange={(event) => setNuevoDestinatarioId(event.target.value)}
                  className="flex-1"
                >
                  <option value="">Seleccione a quién escribirle…</option>
                  {candidatosNuevaConversacion.map((persona) => (
                    <option key={persona.id} value={persona.id}>
                      {persona.nombre_completo} ·{' '}
                      {persona.roles.map((r) => ETIQUETA_ROL[r]).join(', ')}
                    </option>
                  ))}
                </Select>
                <Button
                  type="button"
                  size="icon"
                  disabled={!nuevoDestinatarioId}
                  aria-label="Iniciar conversación"
                  onClick={() => {
                    setContraparteId(nuevoDestinatarioId)
                    setNuevoDestinatarioId('')
                  }}
                >
                  <Send className="size-4" />
                </Button>
              </div>
            </label>
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
              {conversaciones.isLoading ? (
                Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton key={index} className="h-14 w-full rounded-lg" />
                ))
              ) : conversaciones.conversaciones.length ? (
                conversaciones.conversaciones
                  .sort((a, b) =>
                    b.ultimoMensaje.creado_en.localeCompare(a.ultimoMensaje.creado_en),
                  )
                  .map((conversacion) => (
                    <button
                      key={conversacion.contraparteId}
                      type="button"
                      className="flex w-full items-start justify-between gap-2 rounded-lg border p-3 text-left text-sm transition hover:bg-accent/50"
                      onClick={() => setContraparteId(conversacion.contraparteId)}
                    >
                      <span>
                        <span className="block font-medium">{conversacion.contraparteNombre}</span>
                        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                          {conversacion.ultimoMensaje.cuerpo}
                        </span>
                      </span>
                      {conversacion.noLeidos > 0 && (
                        <Badge variant="warning">{conversacion.noLeidos}</Badge>
                      )}
                    </button>
                  ))
              ) : (
                <p className="text-sm text-muted-foreground">Todavía no tiene conversaciones.</p>
              )}
            </div>
          </div>
        )}
      </TabsContent>

      <TabsContent value="equipo" className="flex min-h-0 flex-1 flex-col gap-3">
        {esGestor && (
          <label className="grid gap-2 text-sm font-medium">
            Difundir a
            <Select
              value={rolDifusion}
              onChange={(event) => setRolDifusion(event.target.value as RolStaff)}
            >
              <option value="administrador">Todos los administradores</option>
              <option value="encargado">Todos los encargados</option>
              <option value="operador">Todos los operadores</option>
            </Select>
          </label>
        )}
        <InternalMessagesThread
          mensajes={difusiones.data ?? []}
          isLoading={difusiones.isLoading}
          error={difusiones.error}
          usuarioActualId={usuarioId}
          enviando={enviar.isPending}
          placeholder="Escriba un aviso para el equipo…"
          vacio="No hay avisos de equipo todavía."
          soloLectura={!esGestor}
          onEnviar={(cuerpo) => enviar.mutateAsync({ destinatarioRol: rolDifusion, cuerpo })}
        />
        {!esGestor && (
          <p className="text-xs text-muted-foreground">
            Solo administración y encargados pueden enviar avisos a todo un rol. Puede escribirle un
            mensaje directo a cualquier persona del staff desde la pestaña "Directos".
          </p>
        )}
      </TabsContent>
    </Tabs>
  )
}
