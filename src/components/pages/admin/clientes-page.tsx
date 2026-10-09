import { useQuery, useQueryClient } from '@tanstack/react-query'
import { FileCog, FileText, MapPinned, MessageCircle, UsersRound, Wrench, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Badge } from '@/components/atoms/badge'
import { Button } from '@/components/atoms/button'
import { Checkbox } from '@/components/atoms/checkbox'
import { ClientEquipmentManager } from '@/components/organisms/client-equipment-manager'
import { ClientReportTemplateManager } from '@/components/organisms/client-report-template-manager'
import { ClientLocationsManager } from '@/components/organisms/client-locations-manager'
import { ClientDocumentsManager } from '@/components/organisms/client-documents-manager'
import { CatalogManager } from '@/components/organisms/catalog-manager'
import { WhatsappSendPanel } from '@/components/organisms/whatsapp-send-panel'
import { useDocumentosCliente } from '@/features/cliente/hooks/use-documentos-cliente'
import type { CampoCatalogo, Cliente } from '@/features/catalogos/types/catalogos.types'
import { supabase } from '@/lib/supabase'

interface UsuarioAsociable {
  id: string
  nombre_completo: string
  telefono: string | null
  cliente_id: string | null
  activo: boolean
  usuario_roles: { roles: { nombre: string } | null }[]
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
  const [clienteEquipos, setClienteEquipos] = useState<Cliente | null>(null)
  const [clienteDocumentos, setClienteDocumentos] = useState<Cliente | null>(null)
  const [clienteContactos, setClienteContactos] = useState<Cliente | null>(null)
  const [clienteWhatsapp, setClienteWhatsapp] = useState<Cliente | null>(null)
  const [clientePlantilla, setClientePlantilla] = useState<Cliente | null>(null)
  const ubicacionesRef = useRef<HTMLDivElement>(null)
  const equiposRef = useRef<HTMLDivElement>(null)
  const contactosRef = useRef<HTMLDivElement>(null)
  const whatsappRef = useRef<HTMLDivElement>(null)
  const plantillaRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (clienteUbicaciones) {
      requestAnimationFrame(() =>
        ubicacionesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
      )
    }
  }, [clienteUbicaciones])
  useEffect(() => {
    if (clienteEquipos) {
      requestAnimationFrame(() =>
        equiposRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
      )
    }
  }, [clienteEquipos])
  useEffect(() => {
    if (clienteContactos) {
      requestAnimationFrame(() =>
        contactosRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
      )
    }
  }, [clienteContactos])
  useEffect(() => {
    if (clienteWhatsapp) {
      requestAnimationFrame(() =>
        whatsappRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
      )
    }
  }, [clienteWhatsapp])
  useEffect(() => {
    if (clientePlantilla) {
      requestAnimationFrame(() =>
        plantillaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
      )
    }
  }, [clientePlantilla])
  const usuarios = useQuery({
    queryKey: ['usuarios-asociables'],
    queryFn: async () => {
      if (!supabase) throw new Error('Supabase no está configurado.')
      const { data, error } = await supabase
        .from('usuarios')
        .select(
          'id, nombre_completo, telefono, cliente_id, activo, usuario_roles!usuario_roles_usuario_id_fkey(roles(nombre))',
        )
        .order('nombre_completo')
      if (error) throw error
      return data as unknown as UsuarioAsociable[]
    },
  })
  const contactosCliente = (usuarios.data ?? []).filter(
    (usuario) => usuario.cliente_id === clienteContactos?.id,
  )

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
              onClick={() => setClienteContactos(cliente)}
              aria-label={`Ver contactos de ${cliente.nombre}`}
              title="Ver contactos"
            >
              <UsersRound className="size-4" />
            </Button>
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
              onClick={() => setClienteEquipos(cliente)}
              aria-label={`Administrar equipos de ${cliente.nombre}`}
              title="Administrar equipos"
            >
              <Wrench className="size-4" />
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
            <Button
              variant="outline"
              className="h-9 px-3"
              onClick={() => setClienteWhatsapp(cliente)}
              aria-label={`Enviar WhatsApp a ${cliente.nombre}`}
              title="Enviar WhatsApp"
            >
              <MessageCircle className="size-4" />
            </Button>
            <Button
              variant="outline"
              className="h-9 px-3"
              onClick={() => setClientePlantilla(cliente)}
              aria-label={`Configurar plantilla de reporte de ${cliente.nombre}`}
              title="Plantilla de reporte"
            >
              <FileCog className="size-4" />
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
      {clienteContactos && (
        <section
          ref={contactosRef}
          className="scroll-mt-24 space-y-4 rounded-xl border-2 border-primary/20 bg-card p-5 shadow-sm"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-primary">
                Directorio de contactos
              </p>
              <h2 className="text-lg font-semibold">Contactos de {clienteContactos.nombre}</h2>
              <p className="text-sm text-muted-foreground">
                Usuarios con acceso al portal asociados a este cliente. Para agregar o quitar
                contactos, edite el cliente.
              </p>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setClienteContactos(null)}
              aria-label="Cerrar contactos"
            >
              <X className="size-4" />
            </Button>
          </div>
          {usuarios.isLoading ? (
            <p className="text-sm text-muted-foreground">Cargando contactos…</p>
          ) : contactosCliente.length ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {contactosCliente.map((contacto) => (
                <article key={contacto.id} className="rounded-lg border bg-muted/20 p-4 text-sm">
                  <p className="font-medium">{contacto.nombre_completo || 'Usuario sin nombre'}</p>
                  <p className="mt-1 text-muted-foreground">
                    {contacto.telefono || 'Sin teléfono'}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {contacto.usuario_roles
                      .flatMap((item) => (item.roles?.nombre ? [item.roles.nombre] : []))
                      .map((nombreRol) => (
                        <Badge key={nombreRol}>{nombreRol}</Badge>
                      ))}
                    {!contacto.activo && <Badge variant="destructive">Inactivo</Badge>}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="rounded-lg border p-6 text-center text-sm text-muted-foreground">
              Este cliente no tiene contactos asociados todavía.
            </p>
          )}
        </section>
      )}
      {clienteWhatsapp && (
        <div ref={whatsappRef}>
          <ClienteWhatsappSeccion
            cliente={clienteWhatsapp}
            onClose={() => setClienteWhatsapp(null)}
          />
        </div>
      )}
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
      {clienteEquipos && (
        <div ref={equiposRef}>
          <ClientEquipmentManager
            cliente={clienteEquipos}
            onClose={() => setClienteEquipos(null)}
          />
        </div>
      )}
      {clientePlantilla && (
        <div ref={plantillaRef}>
          <ClientReportTemplateManager
            cliente={clientePlantilla}
            onClose={() => setClientePlantilla(null)}
          />
        </div>
      )}
    </div>
  )
}

function ClienteWhatsappSeccion({ cliente, onClose }: { cliente: Cliente; onClose: () => void }) {
  const documentos = useDocumentosCliente(String(cliente.id))
  return (
    <WhatsappSendPanel
      destinatarioTipo="cliente"
      destinatarioId={String(cliente.id)}
      nombre={cliente.nombre}
      documentos={documentos.data?.map((documento) => ({
        nombre_archivo: documento.nombre_archivo,
        ruta_storage: documento.ruta_storage,
      }))}
      onClose={onClose}
    />
  )
}
