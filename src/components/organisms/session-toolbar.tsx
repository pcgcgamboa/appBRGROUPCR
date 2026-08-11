import { RoleSwitcher } from '@/components/molecules/role-switcher'

export function SessionToolbar({
  roles,
  active,
  onChange,
}: {
  roles: string[]
  active: string
  onChange: (role: string) => void
}) {
  if (roles.length < 2) return null

  return (
    <div className="mb-6 flex flex-wrap items-center gap-3 rounded-lg border bg-white p-3 shadow-sm">
      <RoleSwitcher roles={roles} active={active} onChange={onChange} />
    </div>
  )
}
