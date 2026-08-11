import { Button } from '@/components/atoms/button'

const labels: Record<string, string> = {
  administrador: 'Administración',
  encargado: 'Gestión de solicitudes',
  solicitante: 'Mis solicitudes',
  operador: 'Atención de servicios',
  cliente: 'Validación de servicios',
}

export function RoleSwitcher({
  roles,
  active,
  onChange,
}: {
  roles: string[]
  active: string
  onChange: (role: string) => void
}) {
  const disponibles = roles.filter((role) => labels[role])
  if (disponibles.length < 2) return null
  return (
    <nav
      className="mb-6 flex flex-wrap items-center gap-2 rounded-lg border bg-white p-3"
      aria-label="Cambiar módulo"
    >
      <span className="mr-2 text-sm font-medium">Módulo:</span>
      {disponibles.map((role) => (
        <Button
          key={role}
          variant={active === role ? 'default' : 'outline'}
          onClick={() => onChange(role)}
        >
          {labels[role]}
        </Button>
      ))}
    </nav>
  )
}
