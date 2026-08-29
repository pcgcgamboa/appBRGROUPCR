import { BriefcaseBusiness, CheckCircle2, FileText, UploadCloud } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/atoms/button'
import { Input } from '@/components/atoms/input'
import { Select } from '@/components/atoms/select'
import { Textarea } from '@/components/atoms/textarea'
import { useCrearPostulacionTecnico } from '@/features/tecnicos/hooks/use-postulaciones-tecnicos'
import type { TipoDocumentoPostulacion } from '@/features/tecnicos/ports/tecnicos-repository'
import { validarArchivo } from '@/features/operador/lib/adjuntos'
import { normalizarError } from '@/lib/errores'

const tiposDocumento: Array<{
  tipo: TipoDocumentoPostulacion
  titulo: string
  descripcion: string
}> = [
  {
    tipo: 'fotografia',
    titulo: 'Fotografía',
    descripcion: 'Fotografía reciente para su perfil profesional.',
  },
  {
    tipo: 'hoja_vida',
    titulo: 'Hoja de vida',
    descripcion: 'CurrÃ­culum actualizado con experiencia y formaciÃ³n.',
  },
  {
    tipo: 'hoja_delincuencia',
    titulo: 'Hoja de delincuencia',
    descripcion: 'CertificaciÃ³n vigente de antecedentes penales.',
  },
  {
    tipo: 'cedula',
    titulo: 'CÃ©dula',
    descripcion: 'Copia legible de ambos lados de la identificaciÃ³n.',
  },
]

export function BolsaEmpleoPage() {
  const crearPostulacion = useCrearPostulacionTecnico()
  const [v, setV] = useState({
    nombre: '',
    identificacion: '',
    especialidad: 'albanil' as 'albanil' | 'soldador' | 'chofer',
    celular: '',
    correo: '',
    provincia: '',
    canton: '',
    direccion: '',
    experiencia: '',
    disponibilidad: '',
    pretensionSalarial: '',
  })
  const [documentos, setDocumentos] = useState<Partial<Record<TipoDocumentoPostulacion, File>>>({})
  const [errorArchivo, setErrorArchivo] = useState('')
  const [enviado, setEnviado] = useState(false)

  function seleccionarDocumento(tipo: TipoDocumentoPostulacion, archivo?: File) {
    if (!archivo) return
    const error = validarArchivo(archivo)
    if (error) {
      setErrorArchivo(error)
      return
    }
    setErrorArchivo('')
    setDocumentos((actuales) => ({ ...actuales, [tipo]: archivo }))
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    const completos = tiposDocumento.every(({ tipo }) => documentos[tipo])
    if (!completos) {
      setErrorArchivo('Adjunte la fotografía y los tres documentos obligatorios.')
      return
    }

    await crearPostulacion.mutateAsync({
      ...v,
      pretensionSalarial: Number(v.pretensionSalarial),
      documentos: documentos as Record<TipoDocumentoPostulacion, File>,
    })
    setEnviado(true)
  }

  if (enviado)
    return (
      <section className="mx-auto max-w-xl py-16 text-center">
        <CheckCircle2 className="mx-auto size-14 text-success" />
        <h1 className="mt-4 text-2xl font-bold">PostulaciÃ³n recibida</h1>
        <p className="mt-2 text-muted-foreground">
          El Administrador de Proceso revisarÃ¡ sus datos y documentos antes de incorporarlo a la
          bolsa de tÃ©cnicos.
        </p>
        <Button
          className="mt-6"
          onClick={() => {
            crearPostulacion.reset()
            setDocumentos({})
            setEnviado(false)
          }}
        >
          Enviar otra postulaciÃ³n
        </Button>
      </section>
    )

  const mensajeError = crearPostulacion.error
    ? normalizarError(crearPostulacion.error).mensaje
    : errorArchivo

  return (
    <section className="mx-auto max-w-3xl py-8">
      <div className="mb-6">
        <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-primary">
          <BriefcaseBusiness className="size-4" />
          Bolsa de empleo
        </p>
        <h1 className="mt-2 text-3xl font-bold">Ãšnase a nuestra red de tÃ©cnicos</h1>
        <p className="mt-2 text-muted-foreground">
          Complete su informaciÃ³n y adjunte los documentos solicitados. Toda postulaciÃ³n requiere
          confirmaciÃ³n del Administrador de Proceso.
        </p>
      </div>
      <form
        onSubmit={(event) => void submit(event)}
        className="grid gap-4 rounded-2xl border bg-card p-6 shadow-sm sm:grid-cols-2"
      >
        <label className="grid gap-2 text-sm font-medium">
          Nombre completo
          <Input
            required
            minLength={3}
            value={v.nombre}
            onChange={(event) => setV({ ...v, nombre: event.target.value })}
          />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          IdentificaciÃ³n
          <Input
            required
            minLength={5}
            value={v.identificacion}
            onChange={(event) => setV({ ...v, identificacion: event.target.value })}
          />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Especialidad
          <Select
            value={v.especialidad}
            onChange={(event) =>
              setV({ ...v, especialidad: event.target.value as typeof v.especialidad })
            }
          >
            <option value="albanil">AlbaÃ±il</option>
            <option value="soldador">Soldador</option>
            <option value="chofer">Chofer</option>
          </Select>
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Celular
          <Input
            required
            minLength={8}
            value={v.celular}
            onChange={(event) => setV({ ...v, celular: event.target.value })}
          />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Correo (opcional)
          <Input
            type="email"
            value={v.correo}
            onChange={(event) => setV({ ...v, correo: event.target.value })}
          />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          PretensiÃ³n salarial mensual (â‚¡)
          <Input
            required
            type="number"
            min="1"
            step="0.01"
            value={v.pretensionSalarial}
            onChange={(event) => setV({ ...v, pretensionSalarial: event.target.value })}
          />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Provincia
          <Input
            required
            value={v.provincia}
            onChange={(event) => setV({ ...v, provincia: event.target.value })}
          />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          CantÃ³n
          <Input
            required
            value={v.canton}
            onChange={(event) => setV({ ...v, canton: event.target.value })}
          />
        </label>
        <label className="grid gap-2 text-sm font-medium sm:col-span-2">
          Disponibilidad
          <Input
            value={v.disponibilidad}
            placeholder="Ej. inmediata, fines de semana"
            onChange={(event) => setV({ ...v, disponibilidad: event.target.value })}
          />
        </label>
        <label className="grid gap-2 text-sm font-medium sm:col-span-2">
          DirecciÃ³n
          <Textarea
            value={v.direccion}
            onChange={(event) => setV({ ...v, direccion: event.target.value })}
          />
        </label>
        <label className="grid gap-2 text-sm font-medium sm:col-span-2">
          Experiencia y habilidades
          <Textarea
            required
            minLength={10}
            value={v.experiencia}
            onChange={(event) => setV({ ...v, experiencia: event.target.value })}
          />
        </label>

        <fieldset className="space-y-3 rounded-xl border bg-muted/30 p-4 sm:col-span-2">
          <legend className="px-2 text-sm font-semibold">Documentos obligatorios</legend>
          <p className="text-xs text-muted-foreground">
            Formatos PDF, JPG, PNG o WebP. MÃ¡ximo 10 MB por archivo.
          </p>
          <div className="grid gap-3 md:grid-cols-4">
            {tiposDocumento.map(({ tipo, titulo, descripcion }) => (
              <label
                key={tipo}
                className="flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed bg-card p-4 text-center transition hover:border-primary/40 hover:bg-primary/5"
              >
                {documentos[tipo] ? (
                  <FileText className="size-7 text-success" />
                ) : (
                  <UploadCloud className="size-7 text-primary" />
                )}
                <span className="mt-2 text-sm font-semibold">{titulo}</span>
                <span className="mt-1 text-xs text-muted-foreground">
                  {documentos[tipo]?.name ?? descripcion}
                </span>
                <input
                  className="sr-only"
                  type="file"
                  required={!documentos[tipo]}
                  accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
                  onChange={(event) => seleccionarDocumento(tipo, event.target.files?.[0])}
                />
              </label>
            ))}
          </div>
        </fieldset>

        {mensajeError && (
          <p
            role="alert"
            className="rounded-md bg-destructive-soft p-3 text-sm text-destructive-soft-foreground sm:col-span-2"
          >
            {mensajeError}
          </p>
        )}
        <Button disabled={crearPostulacion.isPending} className="sm:col-span-2">
          {crearPostulacion.isPending ? 'Cargando documentos y enviandoâ€¦' : 'Enviar postulaciÃ³n'}
        </Button>
      </form>
      <p className="mt-4 text-center text-sm">
        <Link className="text-primary underline" to="/login">
          Volver al inicio de sesiÃ³n
        </Link>
      </p>
    </section>
  )
}
