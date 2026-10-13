import { FileText, MessageSquare, Paperclip, Send } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/components/atoms/badge'
import { Button } from '@/components/atoms/button'
import { Input } from '@/components/atoms/input'
import { Select } from '@/components/atoms/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/atoms/tabs'
import { Textarea } from '@/components/atoms/textarea'
import { PanelCloseButton } from '@/components/molecules/panel-close-button'
import { RequestProformas } from '@/components/organisms/request-proformas'
import { useSession } from '@/features/auth/hooks/use-session'
import { useProformas } from '@/features/proformas/hooks/use-proformas'
import {
  useComunicacionesSolicitud,
  useEnviarComunicacion,
} from '@/features/solicitudes/hooks/use-comunicaciones-solicitud'
import type { Comunicacion } from '@/features/solicitudes/types/solicitudes.types'

const fecha = new Intl.DateTimeFormat('es-CR', { dateStyle: 'medium', timeStyle: 'short' })

/**
 * Comunicación de una solicitud entre proveedor y Cliente. `modo="proveedor"` (bandeja del
 * Encargado) escribe al Cliente y puede enviar proformas manuales; `modo="cliente"` (portal del
 * Cliente/solicitante) escribe al proveedor y solo envía mensajes — RLS también lo restringe.
 */
export function RequestCommunications({
  solicitudId,
  modo = 'proveedor',
  onClose,
}: {
  solicitudId: string
  modo?: 'proveedor' | 'cliente'
  /** Cuando se muestra como panel cerrable: X en la esquina superior derecha. */
  onClose?: () => void
}) {
  const esCliente = modo === 'cliente'
  const { session } = useSession()
  const comunicaciones = useComunicacionesSolicitud(solicitudId)
  const enviar = useEnviarComunicacion()
  const [tipo, setTipo] = useState<'mensaje' | 'proforma'>('mensaje')
  const [asunto, setAsunto] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [monto, setMonto] = useState('')
  const [archivos, setArchivos] = useState<File[]>([])
  const tipoEnvio = esCliente ? 'mensaje' : tipo
  const proformasFormales = useProformas(solicitudId)
  const [seccion, setSeccion] = useState<'mensajes' | 'proformas' | 'documentos'>('mensajes')
  const todas = comunicaciones.data ?? []
  const mensajes = todas.filter((item) => item.tipo === 'mensaje')
  const proformasManuales = todas.filter((item) => item.tipo === 'proforma')
  const documentos = todas.flatMap((item) =>
    item.adjuntos.map((adjunto) => ({ ...adjunto, comunicacion: item })),
  )
  const totalProformas = proformasManuales.length + (proformasFormales.data?.length ?? 0)

  async function guardar() {
    await enviar.mutateAsync({
      solicitudId,
      tipo: tipoEnvio,
      asunto,
      mensaje,
      monto: tipoEnvio === 'proforma' ? Number(monto) : null,
      archivos,
    })
    setAsunto('')
    setMensaje('')
    setMonto('')
    setArchivos([])
  }

  const historial = (items: Comunicacion[], vacio: string) => (
    <div className="space-y-3">
      {items.map((item) => {
        const propio = item.enviado_por === session?.user.id
        return (
          <article
            key={item.id}
            className={
              propio
                ? 'rounded-lg border border-primary/30 bg-primary/5 p-3'
                : 'rounded-lg border p-3'
            }
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                {item.tipo === 'proforma' ? (
                  <FileText className="size-4 text-primary" />
                ) : (
                  <MessageSquare className="size-4 text-primary" />
                )}
                <p className="font-medium">{item.asunto}</p>
              </div>
              <time className="text-xs text-muted-foreground">
                {fecha.format(new Date(item.creado_en))}
              </time>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm">{item.mensaje}</p>
            {item.monto !== null && (
              <p className="mt-2 font-semibold">₡{Number(item.monto).toLocaleString('es-CR')}</p>
            )}
            <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {esCliente && <Badge>{propio ? 'Usted' : 'Proveedor'}</Badge>}
              {item.remitente?.nombre_completo ?? 'Sistema'}
            </p>
            {item.adjuntos.length > 0 && (
              <p className="mt-2 text-xs text-muted-foreground">
                {item.adjuntos.map((adjunto, index) => (
                  <span key={adjunto.id}>
                    {index > 0 && ', '}
                    {adjunto.url ? (
                      <a
                        className="font-medium text-primary underline"
                        href={adjunto.url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {adjunto.nombre_archivo}
                      </a>
                    ) : (
                      adjunto.nombre_archivo
                    )}
                  </span>
                ))}
              </p>
            )}
          </article>
        )
      })}
      {!comunicaciones.isLoading && !items.length && (
        <p className="text-sm text-muted-foreground">{vacio}</p>
      )}
    </div>
  )

  const vacioMensajes = esCliente
    ? 'Aún no hay mensajes. Escriba al proveedor si tiene alguna consulta.'
    : 'No hay mensajes todavía.'

  const redactar = (
    <div className="grid gap-3 rounded-lg bg-muted/40 p-3 sm:grid-cols-2">
      {!esCliente && (
        <label className="grid gap-1 text-sm font-medium">
          Tipo
          <Select value={tipo} onChange={(e) => setTipo(e.target.value as typeof tipo)}>
            <option value="mensaje">Mensaje</option>
            <option value="proforma">Proforma manual</option>
          </Select>
        </label>
      )}
      <label
        className={
          esCliente
            ? 'grid gap-1 text-sm font-medium sm:col-span-2'
            : 'grid gap-1 text-sm font-medium'
        }
      >
        Asunto
        <Input value={asunto} onChange={(e) => setAsunto(e.target.value)} />
      </label>
      {tipoEnvio === 'proforma' && (
        <label className="grid gap-1 text-sm font-medium">
          Monto de la proforma (₡)
          <Input
            type="number"
            min="0"
            step="0.01"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
          />
        </label>
      )}
      <label className="grid gap-1 text-sm font-medium sm:col-span-2">
        Mensaje
        <Textarea rows={4} value={mensaje} onChange={(e) => setMensaje(e.target.value)} />
      </label>
      <label className="grid gap-1 text-sm font-medium sm:col-span-2">
        <span className="flex items-center gap-1">
          <Paperclip className="size-4" /> Adjuntos
        </span>
        <Input
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,application/pdf"
          onChange={(e) => setArchivos(Array.from(e.target.files ?? []))}
        />
        <span className="text-xs font-normal text-muted-foreground">
          PDF o imágenes, máximo 10 MB por archivo.
        </span>
      </label>
      <Button
        className="min-h-11 w-fit sm:col-span-2"
        disabled={
          enviar.isPending ||
          !asunto.trim() ||
          !mensaje.trim() ||
          (tipoEnvio === 'proforma' && (!monto || Number(monto) < 0)) ||
          archivos.some((x) => x.size > 10 * 1024 * 1024)
        }
        onClick={() => void guardar()}
      >
        <Send className="mr-2 size-4" />
        {enviar.isPending ? 'Enviando…' : esCliente ? 'Enviar al proveedor' : 'Enviar al Cliente'}
      </Button>
    </div>
  )

  return (
    <section className="space-y-4 rounded-xl border bg-card p-4">
      <div className="flex items-start gap-2">
        <MessageSquare className="mt-0.5 size-5 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold">
            {esCliente ? 'Comunicación con el proveedor' : 'Comunicación con el Cliente'}
          </h3>
          <p className="text-sm text-muted-foreground">
            {esCliente
              ? 'Consulte las respuestas y proformas del proveedor, o envíele un mensaje.'
              : 'Envíe mensajes, documentos o proformas.'}
          </p>
        </div>
        {onClose && <PanelCloseButton onClose={onClose} label="Cerrar mensajes" />}
      </div>
      {(comunicaciones.error || enviar.error) && (
        <p
          role="alert"
          className="rounded-md bg-destructive-soft p-3 text-sm text-destructive-soft-foreground"
        >
          {(comunicaciones.error || enviar.error)?.message}
        </p>
      )}
      <Tabs
        value={seccion}
        onValueChange={(valor) => setSeccion(valor as typeof seccion)}
        className="space-y-4"
      >
        <TabsList className="w-fit flex-wrap" aria-label="Tipo de comunicación">
          <TabsTrigger value="mensajes">
            <MessageSquare className="mr-2 size-4" />
            Mensajes ({mensajes.length})
          </TabsTrigger>
          <TabsTrigger value="proformas">
            <FileText className="mr-2 size-4" />
            Proformas ({totalProformas})
          </TabsTrigger>
          <TabsTrigger value="documentos">
            <Paperclip className="mr-2 size-4" />
            Documentos ({documentos.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="mensajes" className="space-y-4">
          {/* El Cliente lee primero la conversación y escribe al final; el proveedor redacta arriba. */}
          {esCliente ? (
            <>
              {historial(mensajes, vacioMensajes)}
              {redactar}
            </>
          ) : (
            <>
              {redactar}
              {historial(mensajes, vacioMensajes)}
            </>
          )}
        </TabsContent>
        <TabsContent value="proformas" className="space-y-4">
          <RequestProformas solicitudId={solicitudId} modo={modo} />
          {proformasManuales.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold">Proformas enviadas como mensaje</h4>
              {historial(proformasManuales, '')}
            </div>
          )}
        </TabsContent>
        <TabsContent value="documentos">
          {documentos.length ? (
            <ul className="grid gap-2 sm:grid-cols-2">
              {documentos.map((documento) => (
                <li
                  key={documento.id}
                  className="flex min-w-0 items-start gap-3 rounded-lg border p-3"
                >
                  <Paperclip className="mt-0.5 size-4 shrink-0 text-primary" />
                  <div className="min-w-0">
                    {documento.url ? (
                      <a
                        href={documento.url}
                        target="_blank"
                        rel="noreferrer"
                        className="block truncate text-sm font-medium text-primary underline"
                      >
                        {documento.nombre_archivo}
                      </a>
                    ) : (
                      <span className="block truncate text-sm font-medium">
                        {documento.nombre_archivo}
                      </span>
                    )}
                    <p className="truncate text-xs text-muted-foreground">
                      {documento.comunicacion.asunto} ·{' '}
                      {fecha.format(new Date(documento.comunicacion.creado_en))} ·{' '}
                      {documento.comunicacion.enviado_por === session?.user.id
                        ? 'Usted'
                        : (documento.comunicacion.remitente?.nombre_completo ?? 'Sistema')}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              No hay documentos adjuntos en la comunicación.
            </p>
          )}
        </TabsContent>
      </Tabs>
    </section>
  )
}
