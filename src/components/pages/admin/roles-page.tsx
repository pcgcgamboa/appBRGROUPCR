import { CatalogManager } from '@/components/organisms/catalog-manager'
import type { CampoCatalogo, Rol } from '@/features/catalogos/types/catalogos.types'

const fields: CampoCatalogo[] = [
  { name: 'codigo', label: 'Código', required: true },
  { name: 'nombre', label: 'Nombre', required: true },
  { name: 'descripcion', label: 'Descripción', type: 'textarea' },
]

export function RolesPage() {
  return (
    <CatalogManager<Rol>
      tabla="roles"
      title="Roles"
      description="Perfiles de autorización disponibles para asignar a los usuarios."
      fields={fields}
      columns={['codigo', 'nombre', 'descripcion']}
      columnLabels={{ codigo: 'Código', nombre: 'Nombre', descripcion: 'Descripción' }}
    />
  )
}
