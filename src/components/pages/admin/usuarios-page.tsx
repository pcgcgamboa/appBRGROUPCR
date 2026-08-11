import { Pencil, Plus, Trash2, X } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { Badge } from '@/components/atoms/badge'
import { Button } from '@/components/atoms/button'
import { Input } from '@/components/atoms/input'
import { Select } from '@/components/atoms/select'
import { PageHeader } from '@/components/molecules/page-header'
import { useCatalogo } from '@/features/catalogos/hooks/use-catalogo'
import type { Cliente, Rol } from '@/features/catalogos/types/catalogos.types'
import { useUsuariosAdmin } from '@/features/usuarios/hooks/use-usuarios-admin'
import type { DatosUsuarioAdmin, UsuarioAdmin } from '@/features/usuarios/types/usuarios.types'
import { useI18n } from '@/lib/i18n'

const initialValues: DatosUsuarioAdmin = {
  email: '',
  password: '',
  nombre_completo: '',
  telefono: null,
  cliente_id: null,
  activo: true,
  roles: [],
}

export function UsuariosPage() {
  const { t } = useI18n()
  const { usuarios, guardar, eliminar } = useUsuariosAdmin()
  const { listado: roles } = useCatalogo<Rol>('roles')
  const { listado: clientes } = useCatalogo<Cliente>('clientes')
  const [formVisible, setFormVisible] = useState(false)
  const [values, setValues] = useState<DatosUsuarioAdmin>(initialValues)

  function nuevo() {
    setValues(initialValues)
    setFormVisible(true)
  }
  function editar(usuario: UsuarioAdmin) {
    setValues({
      id: usuario.id,
      email: usuario.email,
      nombre_completo: usuario.nombre_completo,
      telefono: usuario.telefono,
      cliente_id: usuario.cliente_id,
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
    setFormVisible(false)
  }
  async function confirmarEliminar(id: string) {
    if (window.confirm(t('deleteUserConfirm'))) await eliminar.mutateAsync(id)
  }
  const error = usuarios.error ?? guardar.error ?? eliminar.error

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader title={t('users')} description={t('usersDescription')} />
        <Button onClick={nuevo}>
          <Plus className="mr-2 size-4" />
          {t('newUser')}
        </Button>
      </div>
      {formVisible && (
        <form
          onSubmit={enviar}
          className="grid gap-4 rounded-lg border bg-white p-5 shadow-sm sm:grid-cols-2"
        >
          <div className="flex items-center justify-between sm:col-span-2">
            <h2 className="font-semibold">{values.id ? t('editUser') : t('newUser')}</h2>
            <Button
              type="button"
              variant="outline"
              className="h-9 px-3"
              onClick={() => setFormVisible(false)}
            >
              <X className="size-4" />
            </Button>
          </div>
          <label className="grid gap-2 text-sm font-medium">
            {t('fullName')}
            <Input
              required
              value={values.nombre_completo}
              onChange={(event) => setValues({ ...values, nombre_completo: event.target.value })}
            />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            {t('email')}
            <Input
              type="email"
              required
              value={values.email}
              onChange={(event) => setValues({ ...values, email: event.target.value })}
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
              onChange={(event) => setValues({ ...values, cliente_id: event.target.value || null })}
            >
              <option value="">{t('noClient')}</option>
              {clientes.data?.map((cliente) => (
                <option key={cliente.id} value={cliente.id}>
                  {cliente.nombre}
                </option>
              ))}
            </Select>
          </label>
          <label className="flex items-center gap-3 text-sm font-medium">
            <input
              type="checkbox"
              className="size-5"
              checked={values.activo}
              onChange={(event) => setValues({ ...values, activo: event.target.checked })}
            />
            {t('activeUser')}
          </label>
          <fieldset className="grid gap-3 sm:col-span-2">
            <legend className="mb-2 text-sm font-semibold">Roles</legend>
            <div className="flex flex-wrap gap-4">
              {roles.data?.map((rol) => (
                <label key={rol.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="size-4"
                    checked={values.roles.includes(rol.id)}
                    onChange={(event) => cambiarRol(rol.id, event.target.checked)}
                  />
                  {rol.nombre}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="flex gap-3 sm:col-span-2">
            <Button type="submit" disabled={guardar.isPending}>
              {guardar.isPending ? t('saving') : t('save')}
            </Button>
            <Button type="button" variant="outline" onClick={() => setFormVisible(false)}>
              {t('cancel')}
            </Button>
          </div>
        </form>
      )}
      {error && (
        <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800">
          {error.message}
        </p>
      )}
      <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="px-4 py-3">{t('name')}</th>
              <th className="px-4 py-3">{t('email')}</th>
              <th className="px-4 py-3">{t('roles')}</th>
              <th className="px-4 py-3">{t('active')}</th>
              <th className="px-4 py-3 text-right">{t('actions')}</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.isLoading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center">
                  {t('loading')}
                </td>
              </tr>
            ) : (
              usuarios.data?.map((usuario) => (
                <tr key={usuario.id} className="border-t">
                  <td className="px-4 py-3 font-medium">{usuario.nombre_completo}</td>
                  <td className="px-4 py-3">{usuario.email}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {usuario.usuario_roles.map((item) => (
                        <Badge key={item.rol_id}>
                          {roles.data?.find((rol) => rol.id === item.rol_id)?.nombre ?? item.rol_id}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">{usuario.activo ? t('yes') : t('no')}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        className="h-9 px-3"
                        onClick={() => editar(usuario)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="outline"
                        className="h-9 px-3 text-red-700"
                        onClick={() => void confirmarEliminar(usuario.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
