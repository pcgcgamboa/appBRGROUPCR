import { FilePlus2, Send, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/atoms/button'
import { Input } from '@/components/atoms/input'
import { Textarea } from '@/components/atoms/textarea'
import { usePerfilActual } from '@/features/auth/hooks/use-perfil-actual'
import { useSession } from '@/features/auth/hooks/use-session'
import { useGestionProformas, useProformas } from '@/features/proformas/hooks/use-proformas'
import type { Proforma, ProformaItem } from '@/features/proformas/types/proformas.types'
import { normalizarError } from '@/lib/errores'

const dinero = (valor: number) =>
  new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC' }).format(valor)
export function RequestProformas({ solicitudId }: { solicitudId: string }) {
  const listado = useProformas(solicitudId)
  const gestion = useGestionProformas(solicitudId)
  const { session } = useSession()
  const perfil = usePerfilActual(session?.user.id)
  const puedeGestionar =
    perfil.data?.roles.some((rol) => rol === 'administrador' || rol === 'encargado') ?? false
  const error =
    listado.error ?? gestion.generar.error ?? gestion.guardar.error ?? gestion.enviar.error
  return (
    <section className="space-y-4 rounded-lg border p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold">Proformas de costo</h3>
          <p className="text-sm text-muted-foreground">
            Calculadas con inventario, servicios y horas registradas.
          </p>
        </div>
        {puedeGestionar && (
          <Button
            variant="outline"
            disabled={gestion.generar.isPending}
            onClick={() => gestion.generar.mutate()}
          >
            <FilePlus2 className="mr-2 size-4" />
            {gestion.generar.isPending ? 'Calculando…' : 'Generar proforma'}
          </Button>
        )}
      </div>
      {error && (
        <p
          role="alert"
          className="rounded-md bg-destructive-soft p-3 text-sm text-destructive-soft-foreground"
        >
          {normalizarError(error).mensaje}
        </p>
      )}
      <div className="space-y-4">
        {listado.data?.map((proforma) => (
          <ProformaCard
            key={proforma.id}
            proforma={proforma}
            editable={puedeGestionar && proforma.estado === 'borrador'}
            onSave={(input) => gestion.guardar.mutateAsync(input)}
            onSend={() => gestion.enviar.mutateAsync(proforma.id)}
          />
        ))}
      </div>
      {!listado.isLoading && !listado.data?.length && (
        <p className="text-sm text-muted-foreground">No hay proformas generadas.</p>
      )}
    </section>
  )
}
function ProformaCard({
  proforma,
  editable,
  onSave,
  onSend,
}: {
  proforma: Proforma
  editable: boolean
  onSave: (input: {
    id: string
    titulo: string
    notas: string
    descuento: number
    impuesto: number
    items: ProformaItem[]
  }) => Promise<void>
  onSend: () => Promise<void>
}) {
  const [titulo, setTitulo] = useState(proforma.titulo)
  const [notas, setNotas] = useState(proforma.notas ?? '')
  const [descuento, setDescuento] = useState(Number(proforma.descuento_porcentaje))
  const [impuesto, setImpuesto] = useState(Number(proforma.impuesto_porcentaje))
  const [items, setItems] = useState(
    proforma.items.map((item) => ({
      ...item,
      cantidad: Number(item.cantidad),
      precio_unitario: Number(item.precio_unitario),
    })),
  )
  const [guardando, setGuardando] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const subtotal = items.reduce((suma, item) => suma + item.cantidad * item.precio_unitario, 0)
  const montoDescuento = (subtotal * descuento) / 100
  const montoImpuesto = ((subtotal - montoDescuento) * impuesto) / 100
  const total = subtotal - montoDescuento + montoImpuesto
  function cambiar(index: number, cambios: Partial<ProformaItem>) {
    setItems((actual) =>
      actual.map((item, posicion) => (posicion === index ? { ...item, ...cambios } : item)),
    )
  }
  async function guardar() {
    setGuardando(true)
    try {
      await onSave({ id: proforma.id, titulo, notas, descuento, impuesto, items })
    } finally {
      setGuardando(false)
    }
  }
  async function enviar() {
    setEnviando(true)
    try {
      await guardar()
      await onSend()
    } finally {
      setEnviando(false)
    }
  }
  return (
    <article className="space-y-4 rounded-lg border bg-muted/20 p-4">
      <div className="flex flex-wrap justify-between gap-2">
        <div>
          <p className="text-xs text-muted-foreground">Proforma #{proforma.numero}</p>
          {editable ? (
            <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} />
          ) : (
            <h4 className="font-semibold">{proforma.titulo}</h4>
          )}
        </div>
        <span className="text-sm font-semibold">{proforma.estado}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr>
              <th>Concepto</th>
              <th>Cantidad</th>
              <th>Unidad</th>
              <th>Precio unitario</th>
              <th>Total</th>
              {editable && <th />}
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={item.id ?? index} className="border-t">
                <td className="py-2">
                  {editable ? (
                    <Input
                      value={item.descripcion}
                      onChange={(e) => cambiar(index, { descripcion: e.target.value })}
                    />
                  ) : (
                    item.descripcion
                  )}
                </td>
                <td>
                  {editable ? (
                    <Input
                      className="w-24"
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={item.cantidad}
                      onChange={(e) => cambiar(index, { cantidad: Number(e.target.value) })}
                    />
                  ) : (
                    item.cantidad
                  )}
                </td>
                <td>
                  {editable ? (
                    <Input
                      className="w-24"
                      value={item.unidad}
                      onChange={(e) => cambiar(index, { unidad: e.target.value })}
                    />
                  ) : (
                    item.unidad
                  )}
                </td>
                <td>
                  {editable ? (
                    <Input
                      className="w-32"
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.precio_unitario}
                      onChange={(e) => cambiar(index, { precio_unitario: Number(e.target.value) })}
                    />
                  ) : (
                    dinero(item.precio_unitario)
                  )}
                </td>
                <td>{dinero(item.cantidad * item.precio_unitario)}</td>
                {editable && (
                  <td>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      aria-label="Eliminar concepto"
                      onClick={() =>
                        setItems((actual) => actual.filter((_, posicion) => posicion !== index))
                      }
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editable && (
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            setItems((actual) => [
              ...actual,
              {
                tipo: 'manual',
                origen_id: null,
                descripcion: 'Nuevo concepto',
                cantidad: 1,
                unidad: 'unidad',
                precio_unitario: 0,
                orden: actual.length + 1,
              },
            ])
          }
        >
          Agregar concepto
        </Button>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {editable && (
          <>
            <label className="grid gap-1 text-sm">
              Descuento (%)
              <Input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={descuento}
                onChange={(e) => setDescuento(Number(e.target.value))}
              />
            </label>
            <label className="grid gap-1 text-sm">
              Impuesto (%)
              <Input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={impuesto}
                onChange={(e) => setImpuesto(Number(e.target.value))}
              />
            </label>
            <label className="grid gap-1 text-sm sm:col-span-2">
              Notas
              <Textarea value={notas} onChange={(e) => setNotas(e.target.value)} />
            </label>
          </>
        )}
        <div className="space-y-1 text-right sm:col-span-2">
          <p>Subtotal: {dinero(subtotal)}</p>
          <p>Descuento: {dinero(montoDescuento)}</p>
          <p>Impuesto: {dinero(montoImpuesto)}</p>
          <p className="text-lg font-bold">Total: {dinero(total)}</p>
        </div>
      </div>
      {editable && (
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            disabled={guardando || !items.length}
            onClick={() => void guardar()}
          >
            {guardando ? 'Guardando…' : 'Guardar borrador'}
          </Button>
          <Button disabled={enviando || !items.length} onClick={() => void enviar()}>
            <Send className="mr-2 size-4" />
            {enviando ? 'Enviando…' : 'Guardar y enviar al cliente'}
          </Button>
        </div>
      )}
    </article>
  )
}
