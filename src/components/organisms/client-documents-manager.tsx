import { Download, FilePlus2, FileText, Image, Trash2, Upload, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { Button } from '@/components/atoms/button'
import { Input } from '@/components/atoms/input'
import { Select } from '@/components/atoms/select'
import { Textarea } from '@/components/atoms/textarea'
import { PanelCloseButton } from '@/components/molecules/panel-close-button'
import { useSession } from '@/features/auth/hooks/use-session'
import {
  useDocumentosCliente,
  useGestionDocumentosCliente,
} from '@/features/cliente/hooks/use-documentos-cliente'
import type { DocumentoCliente } from '@/features/cliente/types/cliente.types'

type TipoDocumento = DocumentoCliente['tipo']

const tipos: Array<{ value: TipoDocumento; label: string }> = [
  { value: 'contrato', label: 'Contrato' },
  { value: 'identificacion', label: 'Identificación' },
  { value: 'factura', label: 'Factura' },
  { value: 'proforma', label: 'Proforma' },
  { value: 'otro', label: 'Otro' },
]

// Las proformas y facturas las aporta el proveedor; el Cliente no las sube (también lo impide RLS).
const TIPOS_SOLO_PROVEEDOR: TipoDocumento[] = ['factura', 'proforma']
const TAMANO_MAXIMO = 10 * 1024 * 1024

/** Nombre legible a partir del archivo: sin extensión, separadores como espacios. */
function nombreDesdeArchivo(archivo: File) {
  const base = archivo.name
    .replace(/\.[^.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return base.charAt(0).toLocaleUpperCase('es') + base.slice(1)
}

/** Tipo sugerido por palabras clave del nombre del archivo; si no hay coincidencia, "otro". */
function tipoDesdeArchivo(archivo: File, permitidos: TipoDocumento[]): TipoDocumento {
  const nombre = archivo.name.toLocaleLowerCase('es').normalize('NFD').replace(/[̀-ͯ]/g, '')
  const sugerido: TipoDocumento = /contrat/.test(nombre)
    ? 'contrato'
    : /cedula|identific|pasaporte|dimex/.test(nombre)
      ? 'identificacion'
      : /factur/.test(nombre)
        ? 'factura'
        : /proforma|cotizac/.test(nombre)
          ? 'proforma'
          : 'otro'
  return permitidos.includes(sugerido) ? sugerido : 'otro'
}

/** Fecha de última modificación del archivo en formato yyyy-mm-dd (hora local). */
function fechaDesdeArchivo(archivo: File) {
  const fecha = new Date(archivo.lastModified)
  const dos = (valor: number) => String(valor).padStart(2, '0')
  return `${fecha.getFullYear()}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())}`
}

export function ClientDocumentsManager({
  clienteId,
  clienteNombre,
  canManage = false,
  canUpload = canManage,
  esCliente = false,
  onClose,
}: {
  clienteId: string
  clienteNombre: string
  canManage?: boolean
  canUpload?: boolean
  /** Portal del Cliente: oculta los tipos que solo aporta el proveedor. */
  esCliente?: boolean
  onClose?: () => void
}) {
  const documentos = useDocumentosCliente(clienteId)
  const gestion = useGestionDocumentosCliente()
  const { session } = useSession()
  const tiposSubida = esCliente
    ? tipos.filter((item) => !TIPOS_SOLO_PROVEEDOR.includes(item.value))
    : tipos
  const [formularioAbierto, setFormularioAbierto] = useState(false)
  const [tipo, setTipo] = useState<TipoDocumento>('otro')
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [fecha, setFecha] = useState('')
  const [archivo, setArchivo] = useState<File | null>(null)
  const archivoInput = useRef<HTMLInputElement>(null)
  const [filtro, setFiltro] = useState('todos')
  const [search, setSearch] = useState('')
  const visibles = (documentos.data ?? []).filter(
    (item) =>
      (filtro === 'todos' || item.tipo === filtro) &&
      (!search.trim() ||
        [item.nombre, item.descripcion, item.nombre_archivo, item.tipo]
          .filter(Boolean)
          .join(' ')
          .toLocaleLowerCase('es')
          .includes(search.toLocaleLowerCase('es'))),
  )

  function limpiarFormulario() {
    setTipo('otro')
    setNombre('')
    setDescripcion('')
    setFecha('')
    setArchivo(null)
    if (archivoInput.current) archivoInput.current.value = ''
  }

  function cerrarFormulario() {
    limpiarFormulario()
    gestion.subir.reset()
    setFormularioAbierto(false)
  }

  // El archivo va primero: a partir de él se precargan tipo, nombre y fecha; la descripción queda libre.
  function seleccionarArchivo(seleccionado: File | null) {
    setArchivo(seleccionado)
    if (!seleccionado) return
    setNombre(nombreDesdeArchivo(seleccionado))
    setFecha(fechaDesdeArchivo(seleccionado))
    setTipo(
      tipoDesdeArchivo(
        seleccionado,
        tiposSubida.map((item) => item.value),
      ),
    )
  }

  async function guardar() {
    if (!archivo) return
    await gestion.subir.mutateAsync({ clienteId, tipo, nombre, descripcion, fecha, archivo })
    cerrarFormulario()
  }

  return (
    <section className="scroll-mt-24 space-y-5 rounded-xl border-2 border-primary/20 bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-primary">
            Expediente documental
          </p>
          <h2 className="text-lg font-semibold">Documentos de {clienteNombre}</h2>
          <p className="text-sm text-muted-foreground">
            {esCliente
              ? 'Contratos, identificaciones y otros documentos privados.'
              : 'Contratos, identificaciones, facturas y otros documentos privados.'}
          </p>
        </div>
        <div className="flex gap-2">
          {canUpload && !formularioAbierto && (
            <Button className="min-h-11" onClick={() => setFormularioAbierto(true)}>
              <FilePlus2 className="mr-2 size-4" />
              Agregar documento
            </Button>
          )}
          {onClose && (
            <Button
              variant="outline"
              size="icon"
              className="size-11"
              onClick={onClose}
              aria-label="Cerrar documentos"
            >
              <X className="size-4" />
            </Button>
          )}
        </div>
      </div>
      {(documentos.error || gestion.subir.error || gestion.eliminar.error) && (
        <p
          role="alert"
          className="rounded-md bg-destructive-soft p-3 text-sm text-destructive-soft-foreground"
        >
          {(documentos.error || gestion.subir.error || gestion.eliminar.error)?.message}
        </p>
      )}
      {canUpload && formularioAbierto && (
        <div className="grid gap-3 rounded-lg border bg-muted/30 p-4 sm:grid-cols-2">
          <div className="flex items-center justify-between gap-3 sm:col-span-2">
            <h3 className="font-semibold">Agregar documento</h3>
            <PanelCloseButton
              onClose={cerrarFormulario}
              label="Cerrar formulario de documento"
              className={gestion.subir.isPending ? 'pointer-events-none opacity-50' : undefined}
            />
          </div>
          <label className="grid gap-1 text-sm font-medium sm:col-span-2">
            Archivo
            <Input
              ref={archivoInput}
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/webp"
              onChange={(e) => seleccionarArchivo(e.target.files?.[0] ?? null)}
            />
            <span className="text-xs font-normal text-muted-foreground">
              PDF, JPEG, PNG o WebP, máximo 10 MB. Al elegirlo se completan los datos del documento.
            </span>
            {archivo && archivo.size > TAMANO_MAXIMO && (
              <span role="alert" className="text-xs font-normal text-destructive">
                El archivo supera los 10 MB.
              </span>
            )}
          </label>
          {archivo && (
            <>
              <label className="grid gap-1 text-sm font-medium">
                Tipo
                <Select value={tipo} onChange={(e) => setTipo(e.target.value as TipoDocumento)}>
                  {tiposSubida.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="grid gap-1 text-sm font-medium">
                Fecha del documento
                <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
              </label>
              <label className="grid gap-1 text-sm font-medium sm:col-span-2">
                Nombre del documento
                <Input value={nombre} onChange={(e) => setNombre(e.target.value)} />
              </label>
              <label className="grid gap-1 text-sm font-medium sm:col-span-2">
                Descripción
                <Textarea
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Opcional"
                />
              </label>
            </>
          )}
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <Button
              className="min-h-11"
              disabled={
                gestion.subir.isPending ||
                !nombre.trim() ||
                !archivo ||
                archivo.size > TAMANO_MAXIMO
              }
              onClick={() => void guardar()}
            >
              <Upload className="mr-2 size-4" />
              {gestion.subir.isPending ? 'Subiendo…' : 'Subir documento'}
            </Button>
            <Button
              variant="outline"
              className="min-h-11"
              disabled={gestion.subir.isPending}
              onClick={cerrarFormulario}
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-[minmax(180px,1fr)_200px]">
        <Input
          type="search"
          placeholder="Buscar documentos…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select value={filtro} onChange={(e) => setFiltro(e.target.value)}>
          <option value="todos">Todos los tipos</option>
          {tipos.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </Select>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {visibles.map((documento) => (
          <article key={documento.id} className="overflow-hidden rounded-lg border">
            <div className="flex min-h-32 items-center justify-center bg-muted/40">
              {documento.mime_type.startsWith('image/') && documento.url ? (
                <img
                  src={documento.url}
                  alt={documento.nombre}
                  className="max-h-52 w-full object-contain"
                />
              ) : (
                <FileText className="size-12 text-primary" />
              )}
            </div>
            <div className="space-y-2 p-4">
              <div className="flex items-start gap-2">
                {documento.mime_type.startsWith('image/') ? (
                  <Image className="mt-0.5 size-4 text-primary" />
                ) : (
                  <FileText className="mt-0.5 size-4 text-primary" />
                )}
                <div>
                  <p className="font-medium">{documento.nombre}</p>
                  <p className="text-xs capitalize text-muted-foreground">
                    {documento.tipo} · {documento.fecha_documento ?? 'Sin fecha'}
                  </p>
                </div>
              </div>
              {documento.descripcion && (
                <p className="text-sm text-muted-foreground">{documento.descripcion}</p>
              )}
              <p className="truncate text-xs text-muted-foreground">{documento.nombre_archivo}</p>
              <div className="flex flex-wrap gap-2">
                {documento.url && (
                  <Button variant="outline" className="h-9" asChild>
                    <a href={documento.url} target="_blank" rel="noreferrer">
                      <Download className="mr-2 size-4" />
                      Visualizar
                    </a>
                  </Button>
                )}
                {/* El Cliente solo elimina lo que él subió; los gestores, todo (igual que RLS). */}
                {canUpload && (!esCliente || documento.subido_por === session?.user.id) && (
                  <Button
                    variant="outline"
                    className="h-9 text-destructive"
                    disabled={gestion.eliminar.isPending}
                    onClick={() => void gestion.eliminar.mutateAsync(documento)}
                  >
                    <Trash2 className="mr-2 size-4" />
                    Eliminar
                  </Button>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>
      {!documentos.isLoading && !visibles.length && (
        <p className="rounded-lg border p-6 text-center text-sm text-muted-foreground">
          No hay documentos para los filtros seleccionados.
        </p>
      )}
    </section>
  )
}
