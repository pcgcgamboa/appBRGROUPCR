import { CatalogManager } from '@/components/organisms/catalog-manager'
import type { CampoCatalogo, Cliente } from '@/features/catalogos/types/catalogos.types'

const fields: CampoCatalogo[] = [
  { name: 'nombre', label: 'Razón social / nombre', required: true },
  { name: 'identificacion', label: 'Identificación' },
  { name: 'email_contacto', label: 'Correo de contacto', type: 'email' },
  { name: 'telefono_contacto', label: 'Teléfono' },
  { name: 'activo', label: 'Cliente activo', type: 'checkbox' },
]

export function ClientesPage() {
  return (
    <CatalogManager<Cliente>
      tabla="clientes"
      title="Clientes"
      description="Organizaciones y contactos que reciben los servicios."
      fields={fields}
      columns={['nombre', 'identificacion', 'email_contacto', 'activo']}
      columnLabels={{
        nombre: 'Nombre',
        identificacion: 'Identificación',
        email_contacto: 'Correo',
        activo: 'Activo',
      }}
    />
  )
}
