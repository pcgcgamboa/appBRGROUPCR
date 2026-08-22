import { BriefcaseBusiness, CheckCircle2 } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { Button } from '@/components/atoms/button'
import { Input } from '@/components/atoms/input'
import { Select } from '@/components/atoms/select'
import { Textarea } from '@/components/atoms/textarea'
import { supabase } from '@/lib/supabase'
export function BolsaEmpleoPage() {
  const [v, setV] = useState({
    nombre: '',
    identificacion: '',
    especialidad: 'albanil',
    celular: '',
    correo: '',
    provincia: '',
    canton: '',
    direccion: '',
    experiencia: '',
    disponibilidad: '',
  })
  const [error, setError] = useState('')
  const [enviado, setEnviado] = useState(false)
  const [loading, setLoading] = useState(false)
  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!supabase) return
    setLoading(true)
    setError('')
    const { error } = await supabase.rpc('crear_postulacion_tecnico', {
      p_nombre: v.nombre,
      p_identificacion: v.identificacion,
      p_especialidad: v.especialidad,
      p_celular: v.celular,
      p_correo: v.correo,
      p_provincia: v.provincia,
      p_canton: v.canton,
      p_direccion: v.direccion,
      p_experiencia: v.experiencia,
      p_disponibilidad: v.disponibilidad,
    })
    setLoading(false)
    if (error) setError(error.message)
    else setEnviado(true)
  }
  if (enviado)
    return (
      <section className="mx-auto max-w-xl py-16 text-center">
        <CheckCircle2 className="mx-auto size-14 text-success" />
        <h1 className="mt-4 text-2xl font-bold">Postulación recibida</h1>
        <p className="mt-2 text-muted-foreground">
          El Administrador de Proceso revisará sus datos antes de incorporarlo a la bolsa de
          técnicos.
        </p>
        <Button className="mt-6" onClick={() => setEnviado(false)}>
          Enviar otra postulación
        </Button>
      </section>
    )
  return (
    <section className="mx-auto max-w-3xl py-8">
      <div className="mb-6">
        <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-primary">
          <BriefcaseBusiness className="size-4" />
          Bolsa de empleo
        </p>
        <h1 className="mt-2 text-3xl font-bold">Únase a nuestra red de técnicos</h1>
        <p className="mt-2 text-muted-foreground">
          Complete su información. Toda postulación requiere confirmación del Administrador de
          Proceso.
        </p>
      </div>
      <form
        onSubmit={submit}
        className="grid gap-4 rounded-2xl border bg-card p-6 shadow-sm sm:grid-cols-2"
      >
        <label className="grid gap-2 text-sm font-medium">
          Nombre completo
          <Input
            required
            minLength={3}
            value={v.nombre}
            onChange={(e) => setV({ ...v, nombre: e.target.value })}
          />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Identificación
          <Input
            required
            minLength={5}
            value={v.identificacion}
            onChange={(e) => setV({ ...v, identificacion: e.target.value })}
          />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Especialidad
          <Select
            value={v.especialidad}
            onChange={(e) => setV({ ...v, especialidad: e.target.value })}
          >
            <option value="albanil">Albañil</option>
            <option value="soldador">Soldador</option>
            <option value="chofer">Chofer</option>
          </Select>
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Celular
          <Input
            required
            value={v.celular}
            onChange={(e) => setV({ ...v, celular: e.target.value })}
          />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Correo (opcional)
          <Input
            type="email"
            value={v.correo}
            onChange={(e) => setV({ ...v, correo: e.target.value })}
          />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Provincia
          <Input
            required
            value={v.provincia}
            onChange={(e) => setV({ ...v, provincia: e.target.value })}
          />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Cantón
          <Input
            required
            value={v.canton}
            onChange={(e) => setV({ ...v, canton: e.target.value })}
          />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Disponibilidad
          <Input
            value={v.disponibilidad}
            placeholder="Ej. inmediata, fines de semana"
            onChange={(e) => setV({ ...v, disponibilidad: e.target.value })}
          />
        </label>
        <label className="grid gap-2 text-sm font-medium sm:col-span-2">
          Dirección
          <Textarea
            value={v.direccion}
            onChange={(e) => setV({ ...v, direccion: e.target.value })}
          />
        </label>
        <label className="grid gap-2 text-sm font-medium sm:col-span-2">
          Experiencia y habilidades
          <Textarea
            required
            minLength={10}
            value={v.experiencia}
            onChange={(e) => setV({ ...v, experiencia: e.target.value })}
          />
        </label>
        {error && (
          <p role="alert" className="rounded-md bg-destructive-soft p-3 text-sm text-destructive-soft-foreground sm:col-span-2">
            {error}
          </p>
        )}
        <Button disabled={loading} className="sm:col-span-2">
          {loading ? 'Enviando…' : 'Enviar postulación'}
        </Button>
      </form>
      <p className="mt-4 text-center text-sm">
        <a className="text-primary underline" href="/">
          Volver al inicio de sesión
        </a>
      </p>
    </section>
  )
}
