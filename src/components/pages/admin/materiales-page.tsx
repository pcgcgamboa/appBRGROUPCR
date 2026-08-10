import { CatalogManager } from '@/components/organisms/catalog-manager'
import type { CampoCatalogo, Material } from '@/features/catalogos/types/catalogos.types'

const fields: CampoCatalogo[] = [
  { name: 'nombre', label: 'Nombre', required: true },
  { name: 'descripcion', label: 'Descripción', type: 'textarea' },
  { name: 'unidad_medida', label: 'Unidad de medida', required: true },
  { name: 'costo_referencial', label: 'Costo referencial', type: 'number', step: '0.01' },
  { name: 'activo', label: 'Material activo', type: 'checkbox' },
]

export function MaterialesPage() {
  return (
    <CatalogManager<Material>
      tabla="materiales"
      title="Materiales"
      description="Insumos disponibles para registrar durante una atención."
      fields={fields}
      columns={['nombre', 'unidad_medida', 'costo_referencial', 'activo']}
      columnLabels={{
        nombre: 'Nombre',
        unidad_medida: 'Unidad',
        costo_referencial: 'Costo',
        activo: 'Activo',
      }}
    />
  )
}
