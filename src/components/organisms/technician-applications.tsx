import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, X } from 'lucide-react'
import { Button } from '@/components/atoms/button'
import { supabase } from '@/lib/supabase'
export function TechnicianApplications() {
  const qc = useQueryClient()
  const listado = useQuery({
    queryKey: ['postulaciones-tecnicos'],
    queryFn: async () => {
      if (!supabase) throw new Error('Supabase no está configurado.')
      const { data, error } = await supabase
        .from('postulaciones_tecnicos')
        .select('*')
        .eq('estado', 'pendiente')
        .order('creado_en', { ascending: false })
      if (error) throw error
      return data
    },
  })
  const resolver = useMutation({
    mutationFn: async ({ id, aprobar }: { id: string; aprobar: boolean }) => {
      if (!supabase) return
      const comentario =
        window.prompt(aprobar ? 'Comentario de aprobación (opcional)' : 'Motivo del rechazo') ?? ''
      if (!aprobar && !comentario.trim()) throw new Error('Indique el motivo del rechazo.')
      const { error } = await supabase.rpc('resolver_postulacion_tecnico', {
        p_postulacion_id: id,
        p_aprobar: aprobar,
        p_comentario: comentario,
      })
      if (error) throw error
    },
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['postulaciones-tecnicos'] }),
        qc.invalidateQueries({ queryKey: ['catalogo', 'tecnicos'] }),
      ])
    },
  })
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Postulaciones pendientes</h2>
        <p className="text-sm text-muted-foreground">
          Confirme los candidatos antes de incorporarlos como técnicos activos.
        </p>
      </div>
      {(listado.error || resolver.error) && (
        <p role="alert" className="rounded-md bg-destructive-soft p-3 text-sm text-destructive-soft-foreground">
          {(listado.error || resolver.error)?.message}
        </p>
      )}
      <div className="grid gap-3">
        {listado.data?.map((p) => (
          <article key={p.id} className="rounded-lg border bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold">{p.nombre_completo}</h3>
                <p className="text-sm">
                  {p.especialidad} · {p.celular} · {p.correo || 'Sin correo'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {p.canton}, {p.provincia}
                </p>
                <p className="mt-2 text-sm">{p.experiencia}</p>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => void resolver.mutateAsync({ id: p.id, aprobar: true })}>
                  <Check className="mr-2 size-4" />
                  Aprobar
                </Button>
                <Button
                  variant="outline"
                  className="text-destructive hover:bg-destructive-soft"
                  onClick={() => void resolver.mutateAsync({ id: p.id, aprobar: false })}
                >
                  <X className="mr-2 size-4" />
                  Rechazar
                </Button>
              </div>
            </div>
          </article>
        ))}
      </div>
      {!listado.isLoading && !listado.data?.length && (
        <p className="rounded-lg border bg-card p-5 text-center text-sm text-muted-foreground">
          No hay postulaciones pendientes.
        </p>
      )}
    </section>
  )
}
