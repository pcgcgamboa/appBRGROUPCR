import { Camera, ChevronDown, LogOut, UserRound } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/atoms/dropdown-menu'
import { useLogout } from '@/features/auth/hooks/use-logout'
import { usePerfilActual } from '@/features/auth/hooks/use-perfil-actual'
import { useSession } from '@/features/auth/hooks/use-session'
import { useActualizarFotoPerfil } from '@/features/auth/hooks/use-actualizar-foto-perfil'
import { useI18n } from '@/lib/i18n'

export function AccountMenu() {
  const { t } = useI18n()
  const { session } = useSession()
  const perfil = usePerfilActual(session?.user.id)
  const logout = useLogout()
  const actualizarFoto = useActualizarFotoPerfil(session?.user.id)

  if (!session) return null
  const nombre = perfil.data?.nombre_completo || session.user.email || t('profile')
  const iniciales = nombre
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte[0])
    .join('')
    .toUpperCase()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex h-11 items-center gap-2 rounded-xl border bg-card px-2 shadow-sm transition hover:border-primary/30 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={t('viewProfile')}
        >
          <span className="flex size-8 items-center justify-center overflow-hidden rounded-lg bg-primary text-xs font-bold text-primary-foreground">
            {perfil.data?.foto_url ? (
              <img src={perfil.data.foto_url} alt="" className="size-full object-cover" />
            ) : (
              iniciales || <UserRound className="size-4" />
            )}
          </span>
          <ChevronDown className="hidden size-4 text-muted-foreground sm:block" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 rounded-2xl p-0">
        <div className="border-b p-4">
          <p className="truncate font-semibold">{nombre}</p>
          <p className="mt-1 truncate text-sm text-muted-foreground">{session.user.email}</p>
          {!!perfil.data?.roles.length && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {perfil.data.roles.map((rol) => (
                <span
                  key={rol}
                  className="rounded-full bg-primary-soft px-2.5 py-1 text-xs font-medium text-primary-soft-foreground"
                >
                  {rol.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          )}
        </div>
        <label className="m-1.5 flex min-h-10 cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-muted">
          <Camera className="size-4" />
          {actualizarFoto.isPending ? 'Actualizando foto…' : 'Cambiar fotografía'}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            disabled={actualizarFoto.isPending}
            onChange={(event) => {
              const archivo = event.target.files?.[0]
              if (archivo) actualizarFoto.mutate(archivo)
            }}
          />
        </label>{' '}
        <DropdownMenuItem
          className="m-1.5 text-destructive focus:bg-destructive-soft focus:text-destructive-soft-foreground"
          onClick={() => logout.mutate()}
        >
          <LogOut className="size-4" />
          {t('signOut')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
