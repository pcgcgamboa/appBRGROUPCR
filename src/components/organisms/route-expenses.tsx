import { type FormEvent, useState } from 'react'
import { Button } from '@/components/atoms/button'
import { Input } from '@/components/atoms/input'
import { Select } from '@/components/atoms/select'
import { Textarea } from '@/components/atoms/textarea'
import { useGastosRuta, useRegistrarGastoRuta } from '@/features/flota/hooks/use-flota'
import type { RutaProceso } from '@/features/flota/types/flota.types'
import { normalizarError } from '@/lib/errores'

export function RouteExpenses({ ruta, onClose }: { ruta: RutaProceso; onClose: () => void }) {
  const gastos = useGastosRuta(ruta.id)
  const registrar = useRegistrarGastoRuta()
  const [participanteId, setParticipanteId] = useState('')
  const [concepto, setConcepto] = useState('')
  const [monto, setMonto] = useState('')
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10))
  const [detalle, setDetalle] = useState('')

  async function guardar(event: FormEvent) {
    event.preventDefault()
    await registrar.mutateAsync({
      ruta_id: ruta.id,
      participante_id: participanteId || null,
      concepto,
      monto: Number(monto),
      fecha,
      detalle: detalle.trim() || null,
    })
    setConcepto('')
    setMonto('')
    setDetalle('')
  }

  const total = gastos.data?.reduce((suma, gasto) => suma + Number(gasto.monto), 0) ?? 0

  return (
    <section className="space-y-5 rounded-lg border bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Gastos de {ruta.codigo}</h2>
          <p className="text-sm text-muted-foreground">
            Registre gastos generales o asígnelos a una persona involucrada.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={onClose}>
          Cerrar
        </Button>
      </div>
      <form onSubmit={guardar} className="grid gap-4 rounded-md border p-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium">
          Asignación
          <Select value={participanteId} onChange={(e) => setParticipanteId(e.target.value)}>
            <option value="">Gasto general de la ruta</option>
            {ruta.ruta_participantes.map((participante) => (
              <option key={participante.usuario_id} value={participante.usuario_id}>
                {participante.usuario?.nombre_completo ?? 'Participante'}
              </option>
            ))}
          </Select>
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Concepto
          <Input required value={concepto} onChange={(e) => setConcepto(e.target.value)} />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Monto (₡)
          <Input
            required
            type="number"
            min="0.01"
            step="0.01"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
          />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Fecha
          <Input required type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </label>
        <label className="grid gap-2 text-sm font-medium md:col-span-2">
          Detalle
          <Textarea value={detalle} onChange={(e) => setDetalle(e.target.value)} />
        </label>
        <Button
          className="w-fit"
          disabled={registrar.isPending || !concepto.trim() || Number(monto) <= 0}
        >
          {registrar.isPending ? 'Registrando…' : 'Registrar gasto'}
        </Button>
      </form>
      {(gastos.error ?? registrar.error) && (
        <p
          role="alert"
          className="rounded-md bg-destructive-soft p-3 text-sm text-destructive-soft-foreground"
        >
          {normalizarError(gastos.error ?? registrar.error).mensaje}
        </p>
      )}
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full min-w-[620px] text-left text-sm">
          <thead>
            <tr>
              <th className="p-3">Fecha</th>
              <th>Concepto</th>
              <th>Asignado a</th>
              <th>Detalle</th>
              <th>Monto</th>
            </tr>
          </thead>
          <tbody>
            {gastos.data?.map((gasto) => (
              <tr key={gasto.id} className="border-t">
                <td className="p-3">{gasto.fecha}</td>
                <td>{gasto.concepto}</td>
                <td>{gasto.participante?.nombre_completo ?? 'General'}</td>
                <td>{gasto.detalle ?? '—'}</td>
                <td>₡{Number(gasto.monto).toLocaleString('es-CR')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-right font-semibold">Total: ₡{total.toLocaleString('es-CR')}</p>
    </section>
  )
}
