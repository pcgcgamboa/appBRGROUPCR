import { ImageIcon, Upload } from 'lucide-react'
import { type ChangeEvent, type FormEvent, useEffect, useState } from 'react'
import { Button } from '@/components/atoms/button'
import { PageHeader } from '@/components/molecules/page-header'
import { useActualizarMarca, useMarca } from '@/features/configuracion/hooks/use-marca'

const tiposPermitidos = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']

export function MarcaPage() {
  const marca = useMarca()
  const actualizar = useActualizarMarca()
  const [logo, setLogo] = useState<File>()
  const [icono, setIcono] = useState<File>()
  const [logoVista, setLogoVista] = useState<string>()
  const [iconoVista, setIconoVista] = useState<string>()

  useEffect(() => {
    return () => {
      if (logoVista) URL.revokeObjectURL(logoVista)
      if (iconoVista) URL.revokeObjectURL(iconoVista)
    }
  }, [logoVista, iconoVista])

  function seleccionar(
    event: ChangeEvent<HTMLInputElement>,
    asignar: (archivo?: File) => void,
    asignarVista: (url?: string) => void,
  ) {
    const archivo = event.target.files?.[0]
    if (!archivo) return
    asignar(archivo)
    asignarVista(URL.createObjectURL(archivo))
  }

  async function guardar(event: FormEvent) {
    event.preventDefault()
    await actualizar.mutateAsync({ logo, icono })
    setLogo(undefined)
    setIcono(undefined)
    setLogoVista(undefined)
    setIconoVista(undefined)
  }

  return (
    <section className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title="Marca e identidad visual"
        description="Personalice el logotipo del acceso y el ícono utilizado en la interfaz."
      />
      <form
        onSubmit={guardar}
        className="space-y-6 rounded-2xl border bg-card p-5 shadow-sm sm:p-7"
      >
        <div className="grid gap-6 md:grid-cols-2">
          <SelectorImagen
            id="logo-marca"
            title="Logotipo del login"
            help="Formato horizontal recomendado. PNG, JPG, WebP o SVG; máximo 5 MB."
            src={logoVista ?? marca.data?.logo_url}
            className="h-36 w-full"
            onChange={(event) => seleccionar(event, setLogo, setLogoVista)}
          />
          <SelectorImagen
            id="icono-marca"
            title="Ícono de la interfaz"
            help="Formato cuadrado recomendado. PNG, JPG, WebP o SVG; máximo 5 MB."
            src={iconoVista ?? marca.data?.icono_url}
            className="mx-auto size-36"
            onChange={(event) => seleccionar(event, setIcono, setIconoVista)}
          />
        </div>
        {actualizar.error && (
          <p
            role="alert"
            className="rounded-lg bg-destructive-soft p-3 text-sm text-destructive-soft-foreground"
          >
            {actualizar.error.message}
          </p>
        )}
        {actualizar.isSuccess && !logo && !icono && (
          <p
            role="status"
            className="rounded-lg bg-success-soft p-3 text-sm text-success-soft-foreground"
          >
            La identidad visual se actualizó correctamente.
          </p>
        )}
        <Button type="submit" disabled={actualizar.isPending || (!logo && !icono)}>
          <Upload className="mr-2 size-4" />
          {actualizar.isPending ? 'Guardando…' : 'Guardar cambios'}
        </Button>
      </form>
    </section>
  )
}

function SelectorImagen({
  id,
  title,
  help,
  src,
  className,
  onChange,
}: {
  id: string
  title: string
  help: string
  src?: string
  className: string
  onChange: (event: ChangeEvent<HTMLInputElement>) => void
}) {
  return (
    <div className="space-y-3 rounded-xl border bg-muted/40 p-4">
      <div>
        <h2 className="font-semibold">{title}</h2>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{help}</p>
      </div>
      <div className="flex h-44 items-center justify-center overflow-hidden rounded-xl border bg-card p-4">
        {src ? (
          <img src={src} alt={`Vista previa: ${title}`} className={`${className} object-contain`} />
        ) : (
          <ImageIcon className="size-10 text-muted-foreground" />
        )}
      </div>
      <label
        htmlFor={id}
        className="inline-flex cursor-pointer items-center text-sm font-semibold text-primary hover:underline"
      >
        Seleccionar archivo
      </label>
      <input
        id={id}
        type="file"
        accept={tiposPermitidos.join(',')}
        className="sr-only"
        onChange={onChange}
      />
    </div>
  )
}
