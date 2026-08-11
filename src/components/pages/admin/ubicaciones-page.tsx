import { CatalogManager } from '@/components/organisms/catalog-manager'
import { LocationMap } from '@/components/organisms/location-map'
import { useCatalogo } from '@/features/catalogos/hooks/use-catalogo'
import type { CampoCatalogo, Cliente, Ubicacion } from '@/features/catalogos/types/catalogos.types'

export function UbicacionesPage() {
  const { listado } = useCatalogo<Cliente>('clientes')
  const fields: CampoCatalogo[] = [
    {
      name: 'cliente_id',
      label: 'Cliente',
      type: 'select',
      required: true,
      options: listado.data?.map((cliente) => ({ value: cliente.id, label: cliente.nombre })) ?? [],
    },
    { name: 'nombre', label: 'Nombre de ubicación', required: true },
    { name: 'provincia', label: 'Provincia', required: true },
    { name: 'canton', label: 'Cantón', required: true },
    { name: 'distrito', label: 'Distrito', required: true },
    { name: 'otras_senas', label: 'Otras señas', type: 'textarea' },
    { name: 'latitud', label: 'Latitud', type: 'number', step: '0.000001' },
    { name: 'longitud', label: 'Longitud', type: 'number', step: '0.000001' },
    { name: 'activa', label: 'Ubicación activa', type: 'checkbox' },
  ]

  return (
    <CatalogManager<Ubicacion>
      tabla="ubicaciones"
      title="Ubicaciones"
      description="Sedes y direcciones asociadas a cada cliente."
      fields={fields}
      columns={['nombre', 'provincia', 'canton', 'distrito', 'activa']}
      columnLabels={{
        nombre: 'Nombre',
        provincia: 'Provincia',
        canton: 'Cantón',
        distrito: 'Distrito',
        activa: 'Activa',
      }}
      extraFormContent={(values, setValues) => {
        const latitud =
          values.latitud === '' || values.latitud === null ? null : Number(values.latitud)
        const longitud =
          values.longitud === '' || values.longitud === null ? null : Number(values.longitud)
        return (
          <div className="space-y-3 sm:col-span-2">
            <div>
              <h3 className="text-sm font-semibold">Seleccione la ubicación en el mapa</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Haga clic sobre el punto exacto en Costa Rica. Puede acercar el mapa para mejorar la
                precisión.
              </p>
            </div>
            <LocationMap
              latitude={Number.isFinite(latitud) ? latitud : null}
              longitude={Number.isFinite(longitud) ? longitud : null}
              label={String(values.nombre || 'Ubicación seleccionada')}
              selectable
              onLocationChange={(latitude, longitude) =>
                setValues((current) => ({
                  ...current,
                  latitud: latitude,
                  longitud: longitude,
                }))
              }
            />
          </div>
        )
      }}
    />
  )
}
