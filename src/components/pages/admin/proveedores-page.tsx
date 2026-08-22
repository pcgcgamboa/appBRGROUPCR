import { CatalogManager } from '@/components/organisms/catalog-manager'
import type { CampoCatalogo, Proveedor } from '@/features/catalogos/types/catalogos.types'
const fields: CampoCatalogo[] = [
  { name: 'nombre', label: 'Proveedor', required: true },
  { name: 'identificacion', label: 'Identificación' },
  { name: 'persona_contacto', label: 'Persona de contacto', required: true },
  { name: 'telefono', label: 'Teléfono', required: true },
  { name: 'celular', label: 'Celular' },
  { name: 'correo', label: 'Correo', type: 'email' },
  { name: 'articulos_provee', label: 'Artículos que provee', type: 'textarea', required: true },
  { name: 'provincia', label: 'Provincia', required: true },
  { name: 'canton', label: 'Cantón', required: true },
  { name: 'distrito', label: 'Distrito', required: true },
  { name: 'direccion', label: 'Dirección exacta', type: 'textarea' },
  { name: 'activo', label: 'Proveedor activo', type: 'checkbox' },
]
export function ProveedoresPage() {
  return (
    <CatalogManager<Proveedor>
      tabla="proveedores"
      title="Proveedores"
      description="Contactos, artículos suministrados y ubicación de proveedores."
      fields={fields}
      columns={[
        'nombre',
        'persona_contacto',
        'telefono',
        'correo',
        'articulos_provee',
        'provincia',
        'activo',
      ]}
      columnLabels={{
        nombre: 'Proveedor',
        persona_contacto: 'Contacto',
        telefono: 'Teléfono',
        correo: 'Correo',
        articulos_provee: 'Artículos',
        provincia: 'Ubicación',
        activo: 'Activo',
      }}
    />
  )
}
