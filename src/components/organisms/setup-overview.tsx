import { Boxes, Database, ShieldCheck } from 'lucide-react'
import { StatusCard } from '@/components/molecules/status-card'

const items = [
  {
    icon: Boxes,
    title: 'Atomic Design',
    description: 'Componentes clasificados por nivel y lógica organizada por funcionalidad.',
  },
  {
    icon: Database,
    title: 'Supabase',
    description: 'Cliente preparado para Auth, Postgres, Storage y Realtime.',
  },
  {
    icon: ShieldCheck,
    title: 'Seguridad por diseño',
    description: 'El acceso se reforzará con políticas RLS en la siguiente fase.',
  },
]

export function SetupOverview() {
  return (
    <section className="grid gap-4 md:grid-cols-3" aria-label="Configuración inicial">
      {items.map((item) => (
        <StatusCard key={item.title} {...item} />
      ))}
    </section>
  )
}
