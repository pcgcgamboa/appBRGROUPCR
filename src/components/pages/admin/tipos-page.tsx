import { CatalogManager } from '@/components/organisms/catalog-manager'
import type { CampoCatalogo, TipoSolicitud } from '@/features/catalogos/types/catalogos.types'

const fields: CampoCatalogo[] = [
  { name: 'nombre', label: 'Nombre', required: true },
  { name: 'descripcion', label: 'Descripción', type: 'textarea' },
  { name: 'activo', label: 'Tipo activo', type: 'checkbox' },
]

export function TiposPage() {
  return (
    <CatalogManager<TipoSolicitud>
      tabla="tipos_solicitud"
      title="Tipos de solicitud"
      description="Servicios disponibles para nuevas solicitudes."
      fields={fields}
      columns={['nombre', 'descripcion', 'activo']}
      columnLabels={{ nombre: 'Nombre', descripcion: 'Descripción', activo: 'Activo' }}
    />
  )
}
