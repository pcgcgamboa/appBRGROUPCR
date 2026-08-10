import { CatalogManager } from '@/components/organisms/catalog-manager'
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
    />
  )
}
