import { MessageCircle, X } from 'lucide-react'
import { type ChangeEvent, useState } from 'react'
import { Badge } from '@/components/atoms/badge'
import { Button } from '@/components/atoms/button'
import { Input } from '@/components/atoms/input'
import { RadioGroup, RadioGroupItem } from '@/components/atoms/radio-group'
import { Select } from '@/components/atoms/select'
import { Skeleton } from '@/components/atoms/skeleton'
import { Textarea } from '@/components/atoms/textarea'
import {
  useEnviarWhatsapp,
  useEnviosWhatsapp,
  useSubirAdjuntoWhatsapp,
} from '@/features/whatsapp/hooks/use-whatsapp'
import type {
  BucketDocumentoWhatsapp,
  DestinatarioWhatsapp,
} from '@/features/whatsapp/types/whatsapp.types'
import { normalizarError } from '@/lib/errores'

interface DocumentoSeleccionable {
  nombre_archivo: string
  ruta_storage: string
}

const TAMANO_MAXIMO_BYTES = 10 * 1024 * 1024
const TIPOS_PERMITIDOS = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
])

export function WhatsappSendPanel({
  destinatarioTipo,
  destinatarioId,
  nombre,
  documentos,
  onClose,
}: {
  destinatarioTipo: DestinatarioWhatsapp
  destinatarioId: string
  nombre: string
  documentos?: DocumentoSeleccionable[]
  onClose: () => void
}) {
  const enviar = useEnviarWhatsapp()
  const subirAdjunto = useSubirAdjuntoWhatsapp()
  const envios = useEnviosWhatsapp(destinatarioTipo, destinatarioId)
  const hayDocumentosExistentes = Boolean(documentos?.length)
  const [metodo, setMetodo] = useState<'directo' | 'bridge'>('directo')
  const [tipo, setTipo] = useState<'mensaje' | 'documento'>('mensaje')
  const [origenDocumento, setOrigenDocumento] = useState<'existente' | 'nuevo'>(
    hayDocumentosExistentes ? 'existente' : 'nuevo',
  )
  const [mensaje, setMensaje] = useState('')
  const [documentoRuta, setDocumentoRuta] = useState('')
  const [archivoLocal, setArchivoLocal] = useState<File | null>(null)
  const [errorArchivo, setErrorArchivo] = useState<string | null>(null)
  const [enlacePendiente, setEnlacePendiente] = useState<string | null>(null)

  const documentoElegido = documentos?.find((item) => item.ruta_storage === documentoRuta)
  const errorEnvio = enviar.error ?? subirAdjunto.error

  function seleccionarArchivo(event: ChangeEvent<HTMLInputElement>) {
    const archivo = event.target.files?.[0]
    if (!archivo) {
      setArchivoLocal(null)
      return
    }
    if (!TIPOS_PERMITIDOS.has(archivo.type)) {
      setErrorArchivo('Tipo de archivo no permitido. Use PDF, Word, Excel o una imagen.')
      setArchivoLocal(null)
      return
    }
    if (archivo.size > TAMANO_MAXIMO_BYTES) {
      setErrorArchivo('El archivo supera el límite de 10 MB.')
      setArchivoLocal(null)
      return
    }
    setErrorArchivo(null)
    setArchivoLocal(archivo)
  }

  async function enviarAhora() {
    // Si el método es "directo", se abre una pestaña en blanco en el mismo clic (antes de esperar
    // la respuesta del Edge Function) y luego se le asigna la URL final — así el navegador no la
    // bloquea por considerar que la apertura ya no viene directo de la acción del usuario.
    const ventana = metodo === 'directo' ? window.open('', '_blank') : null
    setEnlacePendiente(null)
    try {
      if (tipo === 'mensaje') {
        const resultado = await enviar.mutateAsync({
          destinatario_tipo: destinatarioTipo,
          destinatario_id: destinatarioId,
          tipo: 'mensaje',
          mensaje,
          modo: metodo,
        })
        abrirResultado(ventana, resultado.url)
        setMensaje('')
        return
      }

      let rutaStorage: string
      let nombreArchivo: string
      let bucket: BucketDocumentoWhatsapp
      if (origenDocumento === 'existente') {
        if (!documentoElegido) return
        rutaStorage = documentoElegido.ruta_storage
        nombreArchivo = documentoElegido.nombre_archivo
        bucket = 'clientes-documentos'
      } else {
        if (!archivoLocal) return
        const subido = await subirAdjunto.mutateAsync({
          destinatarioTipo,
          destinatarioId,
          archivo: archivoLocal,
        })
        rutaStorage = subido.ruta_storage
        nombreArchivo = subido.nombre_archivo
        bucket = 'whatsapp-adjuntos'
      }

      const resultado = await enviar.mutateAsync({
        destinatario_tipo: destinatarioTipo,
        destinatario_id: destinatarioId,
        tipo: 'documento',
        mensaje: mensaje || undefined,
        documento_ruta_storage: rutaStorage,
        documento_nombre: nombreArchivo,
        documento_bucket: bucket,
        modo: metodo,
      })
      abrirResultado(ventana, resultado.url)
      setMensaje('')
      setDocumentoRuta('')
      setArchivoLocal(null)
    } catch {
      // El error ya queda en enviar.error/subirAdjunto.error (mostrado abajo).
      ventana?.close()
    }
  }

  function abrirResultado(ventana: Window | null, url: string | undefined) {
    if (!url) return
    if (ventana) ventana.location.href = url
    else setEnlacePendiente(url)
  }

  const enviando = enviar.isPending || subirAdjunto.isPending

  return (
    <section className="scroll-mt-24 space-y-4 rounded-xl border-2 border-primary/20 bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-primary">
            Enviar WhatsApp
          </p>
          <h2 className="text-lg font-semibold">{nombre}</h2>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={onClose}
          aria-label="Cerrar envío de WhatsApp"
        >
          <X className="size-4" />
        </Button>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Método de envío</p>
        <RadioGroup value={metodo} onValueChange={(valor) => setMetodo(valor as typeof metodo)}>
          <label className="flex items-center gap-2 text-sm">
            <RadioGroupItem value="directo" />
            Abrir WhatsApp (clic para chatear)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <RadioGroupItem value="bridge" />
            Automático (requiere el servicio configurado)
          </label>
        </RadioGroup>
        <p className="text-xs text-muted-foreground">
          {metodo === 'directo'
            ? 'Se abre WhatsApp con el mensaje ya escrito; usted debe presionar Enviar.'
            : 'Se envía solo, sin abrir nada — necesita whatsapp-bridge configurado.'}
        </p>
      </div>

      <RadioGroup value={tipo} onValueChange={(valor) => setTipo(valor as typeof tipo)}>
        <label className="flex items-center gap-2 text-sm font-medium">
          <RadioGroupItem value="mensaje" />
          Mensaje de texto
        </label>
        <label className="flex items-center gap-2 text-sm font-medium">
          <RadioGroupItem value="documento" />
          Documento
        </label>
      </RadioGroup>

      {tipo === 'documento' && (
        <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
          {hayDocumentosExistentes && (
            <RadioGroup
              value={origenDocumento}
              onValueChange={(valor) => setOrigenDocumento(valor as typeof origenDocumento)}
            >
              <label className="flex items-center gap-2 text-sm font-medium">
                <RadioGroupItem value="existente" />
                Documento ya subido
              </label>
              <label className="flex items-center gap-2 text-sm font-medium">
                <RadioGroupItem value="nuevo" />
                Subir archivo nuevo
              </label>
            </RadioGroup>
          )}

          {origenDocumento === 'existente' && hayDocumentosExistentes ? (
            <label className="grid gap-2 text-sm font-medium">
              Documento
              <Select
                value={documentoRuta}
                onChange={(event) => setDocumentoRuta(event.target.value)}
              >
                <option value="">Seleccione un documento…</option>
                {documentos!.map((documento) => (
                  <option key={documento.ruta_storage} value={documento.ruta_storage}>
                    {documento.nombre_archivo}
                  </option>
                ))}
              </Select>
            </label>
          ) : (
            <label className="grid gap-2 text-sm font-medium">
              Archivo desde esta computadora
              <Input
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,image/jpeg,image/png,image/webp"
                onChange={seleccionarArchivo}
              />
              <span className="text-xs font-normal text-muted-foreground">
                PDF, Word, Excel o imagen. Máximo 10 MB.
              </span>
            </label>
          )}
          {errorArchivo && (
            <p role="alert" className="text-xs text-destructive">
              {errorArchivo}
            </p>
          )}
        </div>
      )}

      <label className="grid gap-2 text-sm font-medium">
        {tipo === 'documento' ? 'Mensaje adicional (opcional)' : 'Mensaje'}
        <Textarea
          required={tipo === 'mensaje'}
          value={mensaje}
          onChange={(event) => setMensaje(event.target.value)}
          placeholder={
            tipo === 'documento'
              ? 'Ej. Le compartimos el documento solicitado.'
              : 'Escriba el mensaje…'
          }
        />
      </label>

      {errorEnvio && (
        <p
          role="alert"
          className="rounded-md bg-destructive-soft p-3 text-sm text-destructive-soft-foreground"
        >
          {normalizarError(errorEnvio).mensaje}
        </p>
      )}
      {enlacePendiente && (
        <p
          role="alert"
          className="rounded-md bg-warning-soft p-3 text-sm text-warning-soft-foreground"
        >
          El navegador bloqueó la ventana emergente.{' '}
          <a href={enlacePendiente} target="_blank" rel="noreferrer" className="underline">
            Haga clic aquí para abrir WhatsApp
          </a>
          .
        </p>
      )}
      {enviar.isSuccess && !enlacePendiente && (
        <p
          role="status"
          className="rounded-md bg-success-soft p-3 text-sm text-success-soft-foreground"
        >
          {metodo === 'directo'
            ? 'Se abrió WhatsApp con el mensaje listo.'
            : 'Enviado correctamente.'}
        </p>
      )}

      <Button
        disabled={
          enviando ||
          (tipo === 'mensaje' && !mensaje.trim()) ||
          (tipo === 'documento' &&
            origenDocumento === 'existente' &&
            (!hayDocumentosExistentes || !documentoRuta)) ||
          (tipo === 'documento' && origenDocumento === 'nuevo' && !archivoLocal)
        }
        onClick={() => void enviarAhora()}
      >
        <MessageCircle className="mr-2 size-4" />
        {enviando ? 'Procesando…' : metodo === 'directo' ? 'Abrir WhatsApp' : 'Enviar'}
      </Button>

      <div className="border-t pt-4">
        <h3 className="mb-3 text-sm font-semibold text-muted-foreground">Envíos recientes</h3>
        <div className="space-y-2">
          {envios.isLoading ? (
            <Skeleton className="h-16 w-full rounded-lg" />
          ) : envios.data?.length ? (
            envios.data.map((envio) => (
              <article key={envio.id} className="rounded-lg border bg-muted/20 p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">
                    {envio.tipo === 'documento' ? envio.documento_nombre : 'Mensaje de texto'}
                  </span>
                  <Badge
                    variant={
                      envio.resultado === 'enviado'
                        ? 'success'
                        : envio.resultado === 'preparado'
                          ? 'primary'
                          : 'destructive'
                    }
                  >
                    {envio.resultado}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(envio.creado_en).toLocaleString('es-CR')} · {envio.telefono}
                </p>
                {envio.resultado === 'preparado' && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Se abrió WhatsApp con el mensaje listo; no confirma si se envió.
                  </p>
                )}
                {envio.mensaje && envio.tipo === 'mensaje' && (
                  <p className="mt-1 truncate text-xs text-muted-foreground">{envio.mensaje}</p>
                )}
                {envio.detalle_error && (
                  <p className="mt-1 text-xs text-destructive">{envio.detalle_error}</p>
                )}
              </article>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">Aún no hay envíos registrados.</p>
          )}
        </div>
      </div>
    </section>
  )
}
