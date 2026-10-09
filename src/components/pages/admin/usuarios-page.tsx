import { HardHat, KeyRound, MessageCircle, Pencil, Plus, Trash2, UserRound } from 'lucide-react'
import { type FormEvent, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/atoms/badge'
import { Button } from '@/components/atoms/button'
import { Input } from '@/components/atoms/input'
import { Select } from '@/components/atoms/select'
import { Checkbox } from '@/components/atoms/checkbox'
import { Skeleton } from '@/components/atoms/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/atoms/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/atoms/alert-dialog'
import { PageHeader } from '@/components/molecules/page-header'
import { useCatalogo } from '@/features/catalogos/hooks/use-catalogo'
import type { Cliente, Rol } from '@/features/catalogos/types/catalogos.types'
import { useUsuariosAdmin } from '@/features/usuarios/hooks/use-usuarios-admin'
import type { DatosUsuarioAdmin, UsuarioAdmin } from '@/features/usuarios/types/usuarios.types'
import { normalizarError } from '@/lib/errores'
import { useI18n } from '@/lib/i18n'
import { useActualizarFotoPerfil } from '@/features/auth/hooks/use-actualizar-foto-perfil'
import { TechniciansManager } from '@/components/organisms/technicians-manager'
import { WhatsappSendPanel } from '@/components/organisms/whatsapp-send-panel'
import { ThOrdenable } from '@/components/atoms/th-ordenable'
import { useOrdenamiento } from '@/hooks/use-ordenamiento'

const initialValues: DatosUsuarioAdmin = {
  cuenta: '',
  correo: null,
  password: '',
  nombre_completo: '',
  telefono: null,
  cliente_id: null,
  costo_hora: 0,
  activo: true,
  roles: [],
}

export function UsuariosPage() {
  const { t } = useI18n()
  const { usuarios, guardar, eliminar, cambiarClave } = useUsuariosAdmin()
  const { listado: roles } = useCatalogo<Rol>('roles')
  const { listado: clientes } = useCatalogo<Cliente>('clientes')
  const [formVisible, setFormVisible] = useState(false)
  const [values, setValues] = useState<DatosUsuarioAdmin>(initialValues)
  const [submodulo, setSubmodulo] = useState<'cuentas' | 'tecnicos'>('cuentas')
  const [usuarioAEliminar, setUsuarioAEliminar] = useState<UsuarioAdmin | null>(null)
  const [usuarioClave, setUsuarioClave] = useState<UsuarioAdmin | null>(null)
  const [usuarioWhatsapp, setUsuarioWhatsapp] = useState<UsuarioAdmin | null>(null)
  const [nuevaClave, setNuevaClave] = useState('')
  const [confirmacionClave, setConfirmacionClave] = useState('')
  const ultimoDisparadorRef = useRef<HTMLElement | null>(null)
  const actualizarFoto = useActualizarFotoPerfil(values.id)
  const nombresRoles = useMemo(
    () => new Map(roles.data?.map((rol) => [rol.id, rol.nombre]) ?? []),
    [roles.data],
  )
  const accesoresOrdenamiento = useMemo(
    () => ({
      nombre: (usuario: UsuarioAdmin) => usuario.nombre_completo,
      cuenta: (usuario: UsuarioAdmin) => usuario.cuenta,
      correo: (usuario: UsuarioAdmin) => usuario.correo,
      roles: (usuario: UsuarioAdmin) =>
        usuario.usuario_roles
          .map((item) => nombresRoles.get(item.rol_id) ?? '')
          .sort()
          .join(', '),
      activo: (usuario: UsuarioAdmin) => (usuario.activo ? 1 : 0),
    }),
    [nombresRoles],
  )
  const {
    datosOrdenados: usuariosOrdenados,
    columnaActiva,
    direccion,
    ordenarPor,
  } = useOrdenamiento(usuarios.data ?? [], accesoresOrdenamiento)

  if (submodulo === 'tecnicos')
    return (
      <section className="space-y-6">
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setSubmodulo('cuentas')}>
            <UserRound className="mr-2 size-4" />
            Cuentas de acceso
          </Button>
          <Button>
            <HardHat className="mr-2 size-4" />
            Técnicos
          </Button>
        </div>
        <TechniciansManager />
      </section>
    )

  function nuevo() {
    ultimoDisparadorRef.current = document.activeElement as HTMLElement
    setValues(initialValues)
    setFormVisible(true)
  }
  function editar(usuario: UsuarioAdmin) {
    ultimoDisparadorRef.current = document.activeElement as HTMLElement
    setValues({
      id: usuario.id,
      cuenta: usuario.cuenta,
      correo: usuario.correo,
      nombre_completo: usuario.nombre_completo,
      telefono: usuario.telefono,
      cliente_id: usuario.cliente_id,
      costo_hora: usuario.costo_hora,
      activo: usuario.activo,
      roles: usuario.usuario_roles.map((item) => item.rol_id),
    })
    setFormVisible(true)
  }
  function cambiarRol(id: number, checked: boolean) {
    setValues((current) => ({
      ...current,
      roles: checked ? [...current.roles, id] : current.roles.filter((rol) => rol !== id),
    }))
  }
  async function enviar(event: FormEvent) {
    event.preventDefault()
    await guardar.mutateAsync(values)
    toast.success(
      values.id ? 'Usuario actualizado correctamente.' : 'Usuario creado correctamente.',
    )
    setFormVisible(false)
  }
  async function confirmarEliminar() {
    if (!usuarioAEliminar) return
    await eliminar.mutateAsync(usuarioAEliminar.id)
    toast.success('Usuario eliminado correctamente.')
    setUsuarioAEliminar(null)
  }

  function abrirCambioClave(usuario: UsuarioAdmin) {
    ultimoDisparadorRef.current = document.activeElement as HTMLElement
    cambiarClave.reset()
    setNuevaClave('')
    setConfirmacionClave('')
    setUsuarioClave(usuario)
  }

  async function guardarClave(event: FormEvent) {
    event.preventDefault()
    if (!usuarioClave || nuevaClave !== confirmacionClave) return
    await cambiarClave.mutateAsync({ id: usuarioClave.id, password: nuevaClave })
    toast.success('Contraseña actualizada correctamente.')
    setUsuarioClave(null)
    setNuevaClave('')
    setConfirmacionClave('')
  }
  const pageError = usuarios.error
  const formError = guardar.error
  const deleteError = eliminar.error

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader title={t('users')} description={t('usersDescription')} />
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="default">{usuarios.data?.length ?? 0} usuarios</Badge>
          <Button variant="outline" onClick={() => setSubmodulo('tecnicos')}>
            <HardHat className="mr-2 size-4" />
            Técnicos
          </Button>
          <Button onClick={nuevo}>
            <Plus className="mr-2 size-4" />
            {t('newUser')}
          </Button>
        </div>
      </div>
      <Dialog open={formVisible} onOpenChange={setFormVisible}>
        <DialogContent
          onCloseAutoFocus={(event) => {
            event.preventDefault()
            ultimoDisparadorRef.current?.focus()
          }}
        >
          <DialogHeader>
            <DialogTitle>{values.id ? t('editUser') : t('newUser')}</DialogTitle>
            <DialogDescription>
              {values.id
                ? 'Actualice los datos del usuario y guarde los cambios.'
                : 'Complete los datos para crear un nuevo usuario.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={enviar} className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium">
              {t('fullName')}
              <Input
                required
                value={values.nombre_completo}
                onChange={(event) => setValues({ ...values, nombre_completo: event.target.value })}
              />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              {t('account')}
              <Input
                required
                minLength={3}
                maxLength={50}
                pattern="[a-z0-9][a-z0-9._-]{2,49}"
                autoComplete="username"
                value={values.cuenta}
                onChange={(event) =>
                  setValues({ ...values, cuenta: event.target.value.toLowerCase() })
                }
              />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              {t('email')} (opcional)
              <Input
                type="email"
                value={values.correo ?? ''}
                onChange={(event) => setValues({ ...values, correo: event.target.value || null })}
              />
            </label>
            {!values.id && (
              <label className="grid gap-2 text-sm font-medium">
                {t('initialPassword')}
                <Input
                  type="password"
                  minLength={8}
                  required
                  value={values.password ?? ''}
                  onChange={(event) => setValues({ ...values, password: event.target.value })}
                />
              </label>
            )}
            <label className="grid gap-2 text-sm font-medium">
              {t('phone')}
              <Input
                value={values.telefono ?? ''}
                onChange={(event) => setValues({ ...values, telefono: event.target.value || null })}
              />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              {t('relatedClient')}
              <Select
                value={values.cliente_id ?? ''}
                onChange={(event) =>
                  setValues({ ...values, cliente_id: event.target.value || null })
                }
              >
                <option value="">{t('noClient')}</option>
                {clientes.data?.map((cliente) => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.nombre}
                  </option>
                ))}
              </Select>
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Costo por hora (₡)
              <Input
                type="number"
                min="0"
                step="0.01"
                value={values.costo_hora}
                onChange={(event) =>
                  setValues({ ...values, costo_hora: Number(event.target.value) })
                }
              />
            </label>{' '}
            <label className="flex items-center gap-3 text-sm font-medium">
              <Checkbox
                checked={values.activo}
                onCheckedChange={(checked) => setValues({ ...values, activo: checked === true })}
              />
              {t('activeUser')}
            </label>
            {values.id && (
              <label className="grid gap-2 text-sm font-medium sm:col-span-2">
                Fotografía del usuario
                <Input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={actualizarFoto.isPending}
                  onChange={(event) => {
                    const archivo = event.target.files?.[0]
                    if (archivo) actualizarFoto.mutate(archivo)
                  }}
                />
              </label>
            )}{' '}
            <fieldset className="grid gap-3 sm:col-span-2">
              <legend className="mb-2 text-sm font-semibold">Roles</legend>
              <div className="flex flex-wrap gap-4">
                {roles.data?.map((rol) => (
                  <label key={rol.id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={values.roles.includes(rol.id)}
                      onCheckedChange={(checked) => cambiarRol(rol.id, checked === true)}
                    />
                    {rol.nombre}
                  </label>
                ))}
              </div>
            </fieldset>
            {formError && (
              <p
                role="alert"
                className="rounded-md bg-destructive-soft p-3 text-sm text-destructive-soft-foreground sm:col-span-2"
              >
                {normalizarError(formError).mensaje}
              </p>
            )}
            <DialogFooter className="sm:col-span-2">
              <Button type="button" variant="outline" onClick={() => setFormVisible(false)}>
                {t('cancel')}
              </Button>
              <Button type="submit" disabled={guardar.isPending}>
                {guardar.isPending ? t('saving') : t('save')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(usuarioClave)}
        onOpenChange={(open) => {
          if (!open) {
            setUsuarioClave(null)
            setNuevaClave('')
            setConfirmacionClave('')
            cambiarClave.reset()
          }
        }}
      >
        <DialogContent
          onCloseAutoFocus={(event) => {
            event.preventDefault()
            ultimoDisparadorRef.current?.focus()
          }}
        >
          <DialogHeader>
            <DialogTitle>Cambiar contraseña</DialogTitle>
            <DialogDescription>
              Establezca una contraseña nueva para {usuarioClave?.nombre_completo}. El usuario
              deberá utilizarla en su próximo inicio de sesión.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={guardarClave} className="grid gap-4">
            <label className="grid gap-2 text-sm font-medium">
              Nueva contraseña
              <Input
                type="password"
                minLength={8}
                required
                autoComplete="new-password"
                value={nuevaClave}
                onChange={(event) => setNuevaClave(event.target.value)}
              />
              <span className="text-xs font-normal text-muted-foreground">
                Debe tener al menos 8 caracteres.
              </span>
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Confirmar contraseña
              <Input
                type="password"
                minLength={8}
                required
                autoComplete="new-password"
                value={confirmacionClave}
                onChange={(event) => setConfirmacionClave(event.target.value)}
                aria-invalid={Boolean(confirmacionClave && nuevaClave !== confirmacionClave)}
              />
              {confirmacionClave && nuevaClave !== confirmacionClave && (
                <span role="alert" className="text-xs font-normal text-destructive">
                  Las contraseñas no coinciden.
                </span>
              )}
            </label>
            {cambiarClave.error && (
              <p
                role="alert"
                className="rounded-md bg-destructive-soft p-3 text-sm text-destructive-soft-foreground"
              >
                {normalizarError(cambiarClave.error).mensaje}
              </p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setUsuarioClave(null)}>
                {t('cancel')}
              </Button>
              <Button
                type="submit"
                disabled={
                  cambiarClave.isPending ||
                  nuevaClave.length < 8 ||
                  nuevaClave !== confirmacionClave
                }
              >
                {cambiarClave.isPending ? 'Actualizando…' : 'Cambiar contraseña'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(usuarioAEliminar)}
        onOpenChange={(open) => !open && setUsuarioAEliminar(null)}
      >
        <AlertDialogContent
          onCloseAutoFocus={(event) => {
            event.preventDefault()
            ultimoDisparadorRef.current?.focus()
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteUserConfirm')}</AlertDialogTitle>
            <AlertDialogDescription>
              {usuarioAEliminar?.nombre_completo} · {usuarioAEliminar?.cuenta}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && (
            <p
              role="alert"
              className="rounded-md bg-destructive-soft p-3 text-sm text-destructive-soft-foreground"
            >
              {normalizarError(deleteError).mensaje}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              disabled={eliminar.isPending}
              onClick={(event) => {
                event.preventDefault()
                void confirmarEliminar()
              }}
            >
              {eliminar.isPending ? '…' : t('save')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {pageError && (
        <p
          role="alert"
          className="rounded-md bg-destructive-soft p-3 text-sm text-destructive-soft-foreground"
        >
          {normalizarError(pageError).mensaje}
        </p>
      )}
      <div className="space-y-5 rounded-2xl border bg-muted/20 p-4 sm:p-6">
        <div className="overflow-x-auto rounded-lg border bg-card shadow-sm">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-muted text-muted-foreground">
              <tr>
                <ThOrdenable
                  columna="nombre"
                  ordenActual={columnaActiva}
                  direccion={direccion}
                  onOrdenar={ordenarPor}
                  className="px-4 py-3"
                >
                  {t('name')}
                </ThOrdenable>
                <ThOrdenable
                  columna="cuenta"
                  ordenActual={columnaActiva}
                  direccion={direccion}
                  onOrdenar={ordenarPor}
                  className="px-4 py-3"
                >
                  {t('account')}
                </ThOrdenable>
                <ThOrdenable
                  columna="correo"
                  ordenActual={columnaActiva}
                  direccion={direccion}
                  onOrdenar={ordenarPor}
                  className="px-4 py-3"
                >
                  {t('email')}
                </ThOrdenable>
                <ThOrdenable
                  columna="roles"
                  ordenActual={columnaActiva}
                  direccion={direccion}
                  onOrdenar={ordenarPor}
                  className="px-4 py-3"
                >
                  {t('roles')}
                </ThOrdenable>
                <ThOrdenable
                  columna="activo"
                  ordenActual={columnaActiva}
                  direccion={direccion}
                  onOrdenar={ordenarPor}
                  className="px-4 py-3"
                >
                  {t('active')}
                </ThOrdenable>
                <th className="px-4 py-3 text-right">{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.isLoading
                ? Array.from({ length: 5 }).map((_, index) => (
                    <tr key={index} className="border-t">
                      {Array.from({ length: 5 }).map((__, cell) => (
                        <td key={cell} className="px-4 py-3">
                          <Skeleton className="h-4 w-full max-w-32" />
                        </td>
                      ))}
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Skeleton className="size-9 rounded-lg" />
                          <Skeleton className="size-9 rounded-lg" />
                        </div>
                      </td>
                    </tr>
                  ))
                : usuariosOrdenados.map((usuario) => (
                    <tr key={usuario.id} className="border-t transition-colors hover:bg-accent/50">
                      <td className="px-4 py-3 font-medium">{usuario.nombre_completo}</td>
                      <td className="px-4 py-3 font-mono text-xs">{usuario.cuenta}</td>
                      <td className="px-4 py-3">{usuario.correo ?? '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {usuario.usuario_roles.map((item) => (
                            <Badge key={item.rol_id}>
                              {roles.data?.find((rol) => rol.id === item.rol_id)?.nombre ??
                                item.rol_id}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">{usuario.activo ? t('yes') : t('no')}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => abrirCambioClave(usuario)}
                            aria-label={`Cambiar contraseña de ${usuario.nombre_completo}`}
                            title="Cambiar contraseña"
                          >
                            <KeyRound className="size-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setUsuarioWhatsapp(usuario)}
                            aria-label={`Enviar WhatsApp a ${usuario.nombre_completo}`}
                            title="Enviar WhatsApp"
                          >
                            <MessageCircle className="size-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => editar(usuario)}
                            aria-label={`Editar ${usuario.nombre_completo}`}
                            title="Editar"
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="text-destructive hover:bg-destructive-soft"
                            onClick={(event) => {
                              ultimoDisparadorRef.current = event.currentTarget
                              setUsuarioAEliminar(usuario)
                            }}
                            aria-label={`Eliminar ${usuario.nombre_completo}`}
                            title="Eliminar"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </div>
      {usuarioWhatsapp && (
        <WhatsappSendPanel
          destinatarioTipo="usuario"
          destinatarioId={usuarioWhatsapp.id}
          nombre={usuarioWhatsapp.nombre_completo}
          onClose={() => setUsuarioWhatsapp(null)}
        />
      )}
    </section>
  )
}
