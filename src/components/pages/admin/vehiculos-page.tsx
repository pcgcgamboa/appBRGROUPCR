import { CatalogManager } from '@/components/organisms/catalog-manager'
import type { CampoCatalogo, Vehiculo } from '@/features/catalogos/types/catalogos.types'

const fields: CampoCatalogo[] = [
  { name: 'placa', label: 'Placa', required: true },
  { name: 'capacidad', label: 'Capacidad' },
  { name: 'tipo', label: 'Tipo', required: true },
  {
    name: 'estado',
    label: 'Estado',
    type: 'select',
    required: true,
    options: [
      { value: 'disponible', label: 'Disponible' },
      { value: 'en_uso', label: 'En uso' },
      { value: 'mantenimiento', label: 'Mantenimiento' },
    ],
  },
  { name: 'activo', label: 'Vehículo activo', type: 'checkbox' },
]

export function VehiculosPage() {
  return (
    <CatalogManager<Vehiculo>
      tabla="vehiculos"
      title="Vehículos"
      description="Flota disponible para el control de ruta."
      fields={fields}
      columns={['placa', 'tipo', 'capacidad', 'estado', 'activo']}
      columnLabels={{
        placa: 'Placa',
        tipo: 'Tipo',
        capacidad: 'Capacidad',
        estado: 'Estado',
        activo: 'Activo',
      }}
    />
  )
}
