import { Button } from '@/components/atoms/button'
import { useI18n, type ClaveTraduccion } from '@/lib/i18n'

const labels: Record<string, ClaveTraduccion> = {
  administrador: 'administration',
  encargado: 'requestManagement',
  solicitante: 'myRequests',
  operador: 'serviceAttention',
  cliente: 'serviceValidation',
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
  const { t } = useI18n()
  const disponibles = roles.filter((role) => labels[role])
  if (disponibles.length < 2) return null
  return (
    <nav className="flex flex-wrap items-center gap-2" aria-label={t('module')}>
      <span className="mr-2 text-sm font-medium">{t('module')}:</span>
      {disponibles.map((role) => (
        <Button
          key={role}
          variant={active === role ? 'default' : 'outline'}
          onClick={() => onChange(role)}
        >
          {t(labels[role])}
        </Button>
      ))}
    </nav>
  )
}
