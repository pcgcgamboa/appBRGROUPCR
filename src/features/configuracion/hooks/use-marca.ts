import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface ConfiguracionMarca {
  logo_url: string
  icono_url: string
}

export const marcaPredeterminada: ConfiguracionMarca = {
  logo_url: '/br-mantenimiento-logo.png',
  icono_url: '/br-icon.png',
}

const queryKey = ['configuracion-marca']

export function useMarca() {
  return useQuery({
    queryKey,
    queryFn: async () => {
      if (!supabase) return marcaPredeterminada
      const { data, error } = await supabase
        .from('configuracion_marca')
        .select('logo_url, icono_url')
        .eq('id', true)
        .single()
      if (error) throw error
      return data as ConfiguracionMarca
    },
    placeholderData: marcaPredeterminada,
    staleTime: 5 * 60_000,
  })
}

export function useActualizarMarca() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ logo, icono }: { logo?: File; icono?: File }) => {
      if (!supabase) throw new Error('Supabase no está configurado.')
      const client = supabase
      const { data: sesion } = await client.auth.getSession()
      const usuarioId = sesion.session?.user.id
      if (!usuarioId) throw new Error('La sesión no es válida.')

      const actual = queryClient.getQueryData<ConfiguracionMarca>(queryKey) ?? marcaPredeterminada
      const version = Date.now()
      const siguiente = { ...actual }

      async function subir(archivo: File, nombre: 'logo' | 'icono') {
        const extension = archivo.name.split('.').pop()?.toLowerCase() || 'png'
        const ruta = `${nombre}.${extension}`
        const { error } = await client.storage.from('marca').upload(ruta, archivo, {
          upsert: true,
          contentType: archivo.type,
          cacheControl: '3600',
        })
        if (error) throw error
        const { data } = client.storage.from('marca').getPublicUrl(ruta)
        return `${data.publicUrl}?v=${version}`
      }

      if (logo) siguiente.logo_url = await subir(logo, 'logo')
      if (icono) siguiente.icono_url = await subir(icono, 'icono')

      const { error } = await client
        .from('configuracion_marca')
        .update({
          ...siguiente,
          actualizado_por: usuarioId,
          actualizado_en: new Date().toISOString(),
        })
        .eq('id', true)
      if (error) throw error
      return siguiente
    },
    onSuccess: (marca) => queryClient.setQueryData(queryKey, marca),
  })
}
