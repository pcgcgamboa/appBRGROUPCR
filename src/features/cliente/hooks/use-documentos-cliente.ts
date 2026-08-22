import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export type DocumentoCliente = {
  id: string
  cliente_id: string
  tipo: 'contrato' | 'identificacion' | 'factura' | 'proforma' | 'otro'
  nombre: string
  descripcion: string | null
  fecha_documento: string | null
  nombre_archivo: string
  ruta_storage: string
  mime_type: string
  tamano_bytes: number
  creado_en: string
  usuario: { nombre_completo: string } | null
  url?: string
}

function client() {
  if (!supabase) throw new Error('Supabase no está configurado.')
  return supabase
}

export function useDocumentosCliente(clienteId: string) {
  return useQuery({
    queryKey: ['documentos-cliente', clienteId],
    queryFn: async () => {
      const { data, error } = await client()
        .from('cliente_documentos')
        .select(
          'id,cliente_id,tipo,nombre,descripcion,fecha_documento,nombre_archivo,ruta_storage,mime_type,tamano_bytes,creado_en,usuario:usuarios!cliente_documentos_subido_por_fkey(nombre_completo)',
        )
        .eq('cliente_id', clienteId)
        .order('creado_en', { ascending: false })
      if (error) throw error
      return Promise.all(
        (data as unknown as DocumentoCliente[]).map(async (documento) => {
          const { data: enlace } = await client()
            .storage.from('clientes-documentos')
            .createSignedUrl(documento.ruta_storage, 3600)
          return { ...documento, url: enlace?.signedUrl }
        }),
      )
    },
  })
}

export function useGestionDocumentosCliente() {
  const qc = useQueryClient()
  const subir = useMutation({
    mutationFn: async (input: {
      clienteId: string
      tipo: DocumentoCliente['tipo']
      nombre: string
      descripcion: string
      fecha: string
      archivo: File
    }) => {
      const { data: auth, error: authError } = await client().auth.getUser()
      if (authError || !auth.user) throw new Error('La sesión no es válida.')
      const id = crypto.randomUUID()
      const seguro = input.archivo.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const ruta = `${input.clienteId}/${id}/${seguro}`
      const carga = await client().storage.from('clientes-documentos').upload(ruta, input.archivo)
      if (carga.error) throw carga.error
      const { error } = await client()
        .from('cliente_documentos')
        .insert({
          id,
          cliente_id: input.clienteId,
          tipo: input.tipo,
          nombre: input.nombre.trim(),
          descripcion: input.descripcion.trim() || null,
          fecha_documento: input.fecha || null,
          nombre_archivo: input.archivo.name,
          ruta_storage: ruta,
          mime_type: input.archivo.type,
          tamano_bytes: input.archivo.size,
          subido_por: auth.user.id,
        })
      if (error) {
        await client().storage.from('clientes-documentos').remove([ruta])
        throw error
      }
      return input.clienteId
    },
    onSuccess: (clienteId) => qc.invalidateQueries({ queryKey: ['documentos-cliente', clienteId] }),
  })
  const eliminar = useMutation({
    mutationFn: async (documento: DocumentoCliente) => {
      const storage = await client()
        .storage.from('clientes-documentos')
        .remove([documento.ruta_storage])
      if (storage.error) throw storage.error
      const { error } = await client().from('cliente_documentos').delete().eq('id', documento.id)
      if (error) throw error
      return documento.cliente_id
    },
    onSuccess: (clienteId) => qc.invalidateQueries({ queryKey: ['documentos-cliente', clienteId] }),
  })
  return { subir, eliminar }
}
