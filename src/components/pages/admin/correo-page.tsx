import { type FormEvent, useEffect, useState } from 'react'
import { Button } from '@/components/atoms/button'
import { Input } from '@/components/atoms/input'
import { RadioGroup, RadioGroupItem } from '@/components/atoms/radio-group'
import { Switch } from '@/components/atoms/switch'
import { PageHeader } from '@/components/molecules/page-header'
import {
  useActualizarCorreo,
  useConfiguracionCorreo,
} from '@/features/configuracion/hooks/use-marca'
import type { ConfiguracionCorreo } from '@/features/configuracion/types/configuracion.types'
import { correoPredeterminada } from '@/features/configuracion/types/configuracion.types'
import { normalizarError } from '@/lib/errores'

export function CorreoPage() {
  const configuracion = useConfiguracionCorreo()
  const actualizar = useActualizarCorreo()
  const [valores, setValores] = useState<ConfiguracionCorreo>(correoPredeterminada)

  useEffect(() => {
    if (configuracion.data) setValores(configuracion.data)
  }, [configuracion.data])

  async function guardar(event: FormEvent) {
    event.preventDefault()
    await actualizar.mutateAsync(valores)
  }

  return (
    <section className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Correo"
        description="Configure el envío de correo hacia los clientes y los avisos internos de la empresa."
      />
      <form
        onSubmit={guardar}
        className="space-y-6 rounded-2xl border bg-card p-5 shadow-sm sm:p-7"
      >
        <div className="flex items-center justify-between gap-4 rounded-xl border bg-muted/40 p-4">
          <div>
            <h2 className="font-semibold">Notificar al cliente</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Permite que un encargado o administrador envíe manualmente, desde la solicitud, un
              correo al cliente con el estado actual. Si está apagado, ese botón no envía nada.
            </p>
          </div>
          <Switch
            checked={valores.notificar_cliente_activo}
            onCheckedChange={(checked) =>
              setValores((actual) => ({ ...actual, notificar_cliente_activo: checked }))
            }
          />
        </div>

        <div className="space-y-3 rounded-xl border bg-muted/40 p-4">
          <div>
            <h2 className="font-semibold">Destino de los correos al cliente</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Cuando está activa la notificación anterior, elija a dónde se envían esos correos.
            </p>
          </div>
          <RadioGroup
            value={valores.modo_envio}
            onValueChange={(valor) =>
              setValores((actual) => ({
                ...actual,
                modo_envio: valor as ConfiguracionCorreo['modo_envio'],
              }))
            }
          >
            <label className="flex items-start gap-3 rounded-lg border bg-card p-3 text-sm">
              <RadioGroupItem value="clientes" className="mt-0.5" />
              <span>
                <span className="block font-medium">Cuenta real del cliente</span>
                <span className="block text-muted-foreground">
                  Cada correo va al contacto configurado en la solicitud.
                </span>
              </span>
            </label>
            <label className="flex items-start gap-3 rounded-lg border bg-card p-3 text-sm">
              <RadioGroupItem value="soporte" className="mt-0.5" />
              <span>
                <span className="block font-medium">Cuenta de soporte</span>
                <span className="block text-muted-foreground">
                  Todos los correos, incluidos los que serían para el cliente, se redirigen a la
                  cuenta de soporte de abajo.
                </span>
              </span>
            </label>
          </RadioGroup>
        </div>

        <label className="grid gap-2 text-sm font-medium">
          Cuenta de soporte
          <Input
            required
            type="email"
            value={valores.correo_soporte}
            onChange={(event) =>
              setValores((actual) => ({ ...actual, correo_soporte: event.target.value }))
            }
          />
          <span className="text-xs font-normal text-muted-foreground">
            Recibe todos los avisos internos (solicitud nueva, postulación de técnico nueva) y,
            cuando el destino de arriba es "Cuenta de soporte", también los correos al cliente.
          </span>
        </label>

        {actualizar.error && (
          <p
            role="alert"
            className="rounded-lg bg-destructive-soft p-3 text-sm text-destructive-soft-foreground"
          >
            {normalizarError(actualizar.error).mensaje}
          </p>
        )}
        {actualizar.isSuccess && (
          <p
            role="status"
            className="rounded-lg bg-success-soft p-3 text-sm text-success-soft-foreground"
          >
            La configuración de correo se actualizó correctamente.
          </p>
        )}
        <Button type="submit" disabled={actualizar.isPending}>
          {actualizar.isPending ? 'Guardando…' : 'Guardar cambios'}
        </Button>
      </form>
    </section>
  )
}
