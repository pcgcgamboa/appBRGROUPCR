import { Camera, Wrench } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/atoms/button'
import { CatalogManager } from '@/components/organisms/catalog-manager'
import type { CampoCatalogo, Vehiculo } from '@/features/catalogos/types/catalogos.types'
import { VehicleAdministration } from '@/components/organisms/vehicle-administration'
import { VehiclePhotos } from '@/components/organisms/vehicle-photos'

const fields: CampoCatalogo[] = [
  { name: 'placa', label: 'Placa', required: true },
  { name: 'capacidad', label: 'Capacidad' },
  { name: 'tipo', label: 'Tipo', required: true },
  { name: 'kilometraje_actual', label: 'Kilometraje actual', type: 'number', step: '0.01' },
  { name: 'costo_inicial', label: 'Costo inicial (₡)', type: 'number', step: '0.01' },
  { name: 'fecha_adquisicion', label: 'Fecha de adquisición', type: 'date' },
  { name: 'vida_util_meses', label: 'Vida útil (meses)', type: 'number' },
  { name: 'valor_residual', label: 'Valor residual (₡)', type: 'number', step: '0.01' },
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
  const [gestionVisible, setGestionVisible] = useState(false)
  const [vehiculoFotos, setVehiculoFotos] = useState<Vehiculo | null>(null)
  return (
    <div className="space-y-8">
      <CatalogManager<Vehiculo>
        tabla="vehiculos"
        title="Vehículos"
        description="Flota disponible para el control de ruta."
        fields={fields}
        columns={[
          'placa',
          'tipo',
          'kilometraje_actual',
          'capacidad',
          'costo_inicial',
          'estado',
          'activo',
        ]}
        columnLabels={{
          placa: 'Placa',
          tipo: 'Tipo',
          capacidad: 'Capacidad',
          estado: 'Estado',
          activo: 'Activo',
          costo_inicial: 'Costo inicial',
          kilometraje_actual: 'Kilometraje actual',
        }}
        headerActions={
          <Button variant="outline" onClick={() => setGestionVisible((visible) => !visible)}>
            <Wrench className="mr-2 size-4" />
            Control de flota
          </Button>
        }
        extraActions={(vehiculo) => (
          <Button
            variant="outline"
            className="h-9 px-3"
            title="Administrar fotos"
            aria-label={`Fotos de ${vehiculo.placa}`}
            onClick={() => setVehiculoFotos(vehiculo)}
          >
            <Camera className="size-4" />
          </Button>
        )}
      />
      {gestionVisible && <VehicleAdministration onClose={() => setGestionVisible(false)} />}
      {vehiculoFotos && (
        <VehiclePhotos vehiculo={vehiculoFotos} onClose={() => setVehiculoFotos(null)} />
      )}
    </div>
  )
}
