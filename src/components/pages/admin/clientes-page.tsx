import { useQuery, useQueryClient } from '@tanstack/react-query'
import { FileText, MapPinned, UsersRound } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/atoms/button'
import { Checkbox } from '@/components/atoms/checkbox'
import { ClientLocationsManager } from '@/components/organisms/client-locations-manager'
import { ClientDocumentsManager } from '@/components/organisms/client-documents-manager'
import { CatalogManager } from '@/components/organisms/catalog-manager'
import type { CampoCatalogo, Cliente } from '@/features/catalogos/types/catalogos.types'
import { supabase } from '@/lib/supabase'

interface UsuarioAsociable {
  id: string
  nombre_completo: string
  cliente_id: string | null
  activo: boolean
}

const fields: CampoCatalogo[] = [
  { name: 'nombre', label: 'Razón social / nombre', required: true },
  { name: 'identificacion', label: 'Identificación' },
  { name: 'email_contacto', label: 'Correo de contacto', type: 'email' },
  { name: 'telefono_contacto', label: 'Teléfono' },
  { name: 'activo', label: 'Cliente activo', type: 'checkbox' },
]

export function ClientesPage() {
  const queryClient = useQueryClient()
  const [usuariosSeleccionados, setUsuariosSeleccionados] = useState<string[]>([])
  const [clienteUbicaciones, setClienteUbicaciones] = useState<Cliente | null>(null)
  const [clienteDocumentos, setClienteDocumentos] = useState<Cliente | null>(null)
  const ubicacionesRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (clienteUbicaciones) {
      requestAnimationFrame(() =>
        ubicacionesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
      )
    }
  }, [clienteUbicaciones])
  const usuarios = useQuery({
    queryKey: ['usuarios-asociables'],
    queryFn: async () => {
      if (!supabase) throw new Error('Supabase no está configurado.')
      const { data, error } = await supabase
        .from('usuarios')
        .select('id, nombre_completo, cliente_id, activo')
        .order('nombre_completo')
      if (error) throw error
      return data as UsuarioAsociable[]
    },
  })

  function seleccionarUsuario(id: string, seleccionado: boolean) {
    setUsuariosSeleccionados((actuales) =>
      seleccionado ? [...actuales, id] : actuales.filter((usuarioId) => usuarioId !== id),
    )
  }

  async function guardarUsuarios(clienteId: string | number) {
    if (!supabase || typeof clienteId !== 'string') return
    const { error } = await supabase.rpc('asociar_usuarios_cliente', {
      p_cliente_id: clienteId,
      p_usuario_ids: usuariosSeleccionados,
    })
    if (error) throw error
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['usuarios-asociables'] }),
      queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
    ])
  }

  return (
    <div className="space-y-6">
      <CatalogManager<Cliente>
        tabla="clientes"
        title="Clientes"
        description="Organizaciones y contactos que reciben los servicios."
        fields={fields}
        columns={['nombre', 'identificacion', 'email_contacto', 'activo']}
        columnLabels={{
          nombre: 'Nombre',
          identificacion: 'Identificación',
          email_contacto: 'Correo',
          activo: 'Activo',
        }}
        onOpenNew={() => setUsuariosSeleccionados([])}
        onOpenEdit={(cliente) =>
          setUsuariosSeleccionados(
            (usuarios.data ?? [])
              .filter((usuario) => usuario.cliente_id === cliente.id)
              .map((usuario) => usuario.id),
          )
        }
        onSaved={guardarUsuarios}
        extraActions={(cliente) => (
          <>
            <Button
              variant="outline"
              className="h-9 px-3"
              onClick={() => setClienteUbicaciones(cliente)}
              aria-label={`Administrar ubicaciones de ${cliente.nombre}`}
              title="Administrar ubicaciones"
            >
              <MapPinned className="size-4" />
            </Button>
            <Button
              variant="outline"
              className="h-9 px-3"
              onClick={() => setClienteDocumentos(cliente)}
              aria-label={`Administrar documentos de ${cliente.nombre}`}
              title="Administrar documentos"
            >
              <FileText className="size-4" />
            </Button>
          </>
        )}
        extraFormContent={
          <fieldset className="rounded-xl border bg-muted/40 p-4 sm:col-span-2">
            <legend className="flex items-center gap-2 px-2 text-sm font-semibold">
              <UsersRound className="size-4 text-primary" />
              Usuarios asociados
            </legend>
            <p className="mb-3 text-xs text-muted-foreground">
              Seleccione uno o varios usuarios que pertenecen a este cliente.
            </p>
            {usuarios.isLoading ? (
              <p className="text-sm text-muted-foreground">Cargando usuarios…</p>
            ) : usuarios.data?.length ? (
              <div className="grid max-h-48 gap-2 overflow-y-auto sm:grid-cols-2">
                {usuarios.data.map((usuario) => (
                  <label
                    key={usuario.id}
                    className="flex cursor-pointer items-center gap-3 rounded-lg border bg-card p-3 text-sm transition hover:border-primary/30"
                  >
                    <Checkbox
                      checked={usuariosSeleccionados.includes(usuario.id)}
                      onCheckedChange={(checked) =>
                        seleccionarUsuario(usuario.id, checked === true)
                      }
                    />
                    <span className="min-w-0">
                      <span className="block truncate font-medium">
                        {usuario.nombre_completo || 'Usuario sin nombre'}
                      </span>
                      {!usuario.activo && (
                        <span className="text-xs text-muted-foreground">Usuario inactivo</span>
                      )}
                    </span>
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No hay usuarios disponibles.</p>
            )}
          </fieldset>
        }
      />
      {clienteDocumentos && (
        <ClientDocumentsManager
          clienteId={String(clienteDocumentos.id)}
          clienteNombre={clienteDocumentos.nombre}
          canManage
          onClose={() => setClienteDocumentos(null)}
        />
      )}{' '}
      {clienteUbicaciones && (
        <div ref={ubicacionesRef}>
          <ClientLocationsManager
            cliente={clienteUbicaciones}
            onClose={() => setClienteUbicaciones(null)}
          />
        </div>
      )}
    </div>
  )
}
