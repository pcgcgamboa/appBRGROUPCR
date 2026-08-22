import { CatalogManager } from '@/components/organisms/catalog-manager'
import type { CampoCatalogo, Tecnico } from '@/features/catalogos/types/catalogos.types'
import { TechnicianApplications } from '@/components/organisms/technician-applications'

const fields: CampoCatalogo[] = [
  { name: 'nombre_completo', label: 'Nombre completo', required: true },
  { name: 'identificacion', label: 'Identificación' },
  {
    name: 'especialidad',
    label: 'Especialidad',
    type: 'select',
    required: true,
    options: [
      { value: 'albanil', label: 'Albañil' },
      { value: 'soldador', label: 'Soldador' },
      { value: 'chofer', label: 'Chofer' },
    ],
  },
  { name: 'celular', label: 'Celular', required: true },
  { name: 'correo', label: 'Correo electrónico (opcional)', type: 'email' },
  { name: 'direccion', label: 'Dirección', type: 'textarea' },
  { name: 'contacto_emergencia', label: 'Contacto de emergencia' },
  { name: 'observaciones', label: 'Observaciones', type: 'textarea' },
  { name: 'activo', label: 'Técnico activo', type: 'checkbox' },
]
export function TechniciansManager() {
  return (
    <div className="space-y-8">
      <TechnicianApplications />
      <CatalogManager<Tecnico>
        tabla="tecnicos"
        title="Técnicos"
        description="Personal técnico disponible para atender solicitudes."
        fields={fields}
        columns={['nombre_completo', 'especialidad', 'celular', 'correo', 'activo']}
        columnLabels={{
          nombre_completo: 'Nombre',
          especialidad: 'Especialidad',
          celular: 'Celular',
          correo: 'Correo',
          activo: 'Activo',
        }}
      />
    </div>
  )
}
