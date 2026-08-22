import { FileText, MessageSquare, Paperclip, Send } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/atoms/button'
import { Input } from '@/components/atoms/input'
import { Select } from '@/components/atoms/select'
import { Textarea } from '@/components/atoms/textarea'
import {
  useComunicacionesSolicitud,
  useEnviarComunicacion,
} from '@/features/solicitudes/hooks/use-comunicaciones-solicitud'

const fecha = new Intl.DateTimeFormat('es-CR', { dateStyle: 'medium', timeStyle: 'short' })

export function RequestCommunications({ solicitudId }: { solicitudId: string }) {
  const comunicaciones = useComunicacionesSolicitud(solicitudId)
  const enviar = useEnviarComunicacion()
  const [tipo, setTipo] = useState<'mensaje' | 'proforma'>('mensaje')
  const [asunto, setAsunto] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [monto, setMonto] = useState('')
  const [archivos, setArchivos] = useState<File[]>([])

  async function guardar() {
    await enviar.mutateAsync({
      solicitudId,
      tipo,
      asunto,
      mensaje,
      monto: tipo === 'proforma' ? Number(monto) : null,
      archivos,
    })
    setAsunto('')
    setMensaje('')
    setMonto('')
    setArchivos([])
  }

  return (
    <section className="space-y-4 rounded-xl border bg-card p-4">
      <div className="flex items-center gap-2">
        <MessageSquare className="size-5 text-primary" />
        <div>
          <h3 className="font-semibold">Comunicación con el Cliente</h3>
          <p className="text-sm text-muted-foreground">Envíe mensajes, documentos o proformas.</p>
        </div>
      </div>
      {(comunicaciones.error || enviar.error) && (
        <p
          role="alert"
          className="rounded-md bg-destructive-soft p-3 text-sm text-destructive-soft-foreground"
        >
          {(comunicaciones.error || enviar.error)?.message}
        </p>
      )}
      <div className="grid gap-3 rounded-lg bg-muted/40 p-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm font-medium">
          Tipo
          <Select value={tipo} onChange={(e) => setTipo(e.target.value as typeof tipo)}>
            <option value="mensaje">Mensaje</option>
            <option value="proforma">Proforma</option>
          </Select>
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Asunto
          <Input value={asunto} onChange={(e) => setAsunto(e.target.value)} />
        </label>
        {tipo === 'proforma' && (
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
          className="w-fit sm:col-span-2"
          disabled={
            enviar.isPending ||
            !asunto.trim() ||
            !mensaje.trim() ||
            (tipo === 'proforma' && (!monto || Number(monto) < 0)) ||
            archivos.some((x) => x.size > 10 * 1024 * 1024)
          }
          onClick={() => void guardar()}
        >
          <Send className="mr-2 size-4" />
          {enviar.isPending ? 'Enviando…' : 'Enviar al Cliente'}
        </Button>
      </div>
      <div className="space-y-3">
        {comunicaciones.data?.map((item) => (
          <article key={item.id} className="rounded-lg border p-3">
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
            <p className="mt-2 text-xs text-muted-foreground">
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
        ))}
        {!comunicaciones.isLoading && !comunicaciones.data?.length && (
          <p className="text-sm text-muted-foreground">No hay comunicaciones todavía.</p>
        )}
      </div>
    </section>
  )
}
