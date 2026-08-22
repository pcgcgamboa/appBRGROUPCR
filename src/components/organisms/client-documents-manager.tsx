import { Download, FileText, Image, Trash2, Upload, X } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/atoms/button'
import { Input } from '@/components/atoms/input'
import { Select } from '@/components/atoms/select'
import { Textarea } from '@/components/atoms/textarea'
import {
  useDocumentosCliente,
  useGestionDocumentosCliente,
} from '@/features/cliente/hooks/use-documentos-cliente'
import type { DocumentoCliente } from '@/features/cliente/types/cliente.types'

const tipos: Array<{ value: DocumentoCliente['tipo']; label: string }> = [
  { value: 'contrato', label: 'Contrato' },
  { value: 'identificacion', label: 'Identificación' },
  { value: 'factura', label: 'Factura' },
  { value: 'proforma', label: 'Proforma' },
  { value: 'otro', label: 'Otro' },
]

export function ClientDocumentsManager({
  clienteId,
  clienteNombre,
  canManage = false,
  canUpload = canManage,
  onClose,
}: {
  clienteId: string
  clienteNombre: string
  canManage?: boolean
  canUpload?: boolean
  onClose?: () => void
}) {
  const documentos = useDocumentosCliente(clienteId)
  const gestion = useGestionDocumentosCliente()
  const [tipo, setTipo] = useState<DocumentoCliente['tipo']>('contrato')
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [fecha, setFecha] = useState('')
  const [archivo, setArchivo] = useState<File | null>(null)
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

  async function guardar() {
    if (!archivo) return
    await gestion.subir.mutateAsync({ clienteId, tipo, nombre, descripcion, fecha, archivo })
    setNombre('')
    setDescripcion('')
    setFecha('')
    setArchivo(null)
  }

  return (
    <section className="scroll-mt-24 space-y-5 rounded-xl border-2 border-primary/20 bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-primary">
            Expediente documental
          </p>
          <h2 className="text-lg font-semibold">Documentos de {clienteNombre}</h2>
          <p className="text-sm text-muted-foreground">
            Contratos, identificaciones, facturas y otros documentos privados.
          </p>
        </div>
        {onClose && (
          <Button variant="outline" size="icon" onClick={onClose} aria-label="Cerrar documentos">
            <X className="size-4" />
          </Button>
        )}
      </div>
      {(documentos.error || gestion.subir.error || gestion.eliminar.error) && (
        <p
          role="alert"
          className="rounded-md bg-destructive-soft p-3 text-sm text-destructive-soft-foreground"
        >
          {(documentos.error || gestion.subir.error || gestion.eliminar.error)?.message}
        </p>
      )}
      {canUpload && (
        <div className="grid gap-3 rounded-lg border bg-muted/30 p-4 sm:grid-cols-2">
          <label className="grid gap-1 text-sm font-medium">
            Tipo
            <Select
              value={tipo}
              onChange={(e) => setTipo(e.target.value as DocumentoCliente['tipo'])}
            >
              {tipos.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </Select>
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Nombre del documento
            <Input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. Contrato de mantenimiento 2026"
            />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Fecha del documento
            <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Archivo
            <Input
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/webp"
              onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
            />
          </label>
          <label className="grid gap-1 text-sm font-medium sm:col-span-2">
            Descripción
            <Textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
          </label>
          <Button
            className="w-fit sm:col-span-2"
            disabled={
              gestion.subir.isPending ||
              !nombre.trim() ||
              !archivo ||
              archivo.size > 10 * 1024 * 1024
            }
            onClick={() => void guardar()}
          >
            <Upload className="mr-2 size-4" />
            {gestion.subir.isPending ? 'Subiendo…' : 'Subir documento'}
          </Button>
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
                {canUpload && (
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
