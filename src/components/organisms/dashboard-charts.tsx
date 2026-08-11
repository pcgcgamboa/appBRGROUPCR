import { ArrowUpRight } from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { DashboardSolicitudes } from '@/features/reportes/types/reportes.types'

const colores = [
  '#1d4ed8',
  '#0f766e',
  '#d97706',
  '#dc2626',
  '#7c3aed',
  '#0891b2',
  '#4d7c0f',
  '#475569',
]
const etiqueta = (value: string) =>
  value.replace(/_/g, ' ').replace(/^./, (letter) => letter.toUpperCase())

function ChartCard({
  title,
  children,
  onClick,
}: {
  title: string
  children: React.ReactNode
  onClick?: () => void
}) {
  return (
    <section
      className="group min-w-0 cursor-pointer rounded-lg border bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:p-5"
      role="link"
      tabIndex={0}
      aria-label={`${title}. Ver solicitudes`}
      onClick={onClick}
      onKeyDown={(event) => {
        if (onClick && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault()
          onClick()
        }
      }}
    >
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="font-semibold">{title}</h2>
        <span className="flex items-center gap-1 text-xs text-muted-foreground transition group-hover:text-primary">
          Ver solicitudes <ArrowUpRight className="size-4" />
        </span>
      </div>
      <div className="h-80">{children}</div>
    </section>
  )
}

export function DashboardCharts({
  data,
  onOpenSolicitudes,
}: {
  data: DashboardSolicitudes
  onOpenSolicitudes?: () => void
}) {
  const estados = data.por_estado.map((item) => ({ ...item, etiqueta: etiqueta(item.nombre) }))
  const prioridades = data.por_prioridad.map((item) => ({
    ...item,
    etiqueta: etiqueta(item.nombre),
  }))
  const urgencia = data.por_urgencia.map((item) => ({ ...item, etiqueta: etiqueta(item.nombre) }))
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <ChartCard title="Solicitudes por estado" onClick={onOpenSolicitudes}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={estados} margin={{ left: 0, right: 10, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="etiqueta"
              angle={-35}
              textAnchor="end"
              interval={0}
              height={80}
              fontSize={11}
            />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="cantidad" name="Solicitudes" fill="#1d4ed8" radius={[5, 5, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
      <ChartCard title="Solicitudes por prioridad" onClick={onOpenSolicitudes}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={prioridades} layout="vertical" margin={{ left: 20, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" allowDecimals={false} />
            <YAxis type="category" dataKey="etiqueta" width={90} fontSize={12} />
            <Tooltip />
            <Bar dataKey="cantidad" name="Solicitudes" fill="#0f766e" radius={[0, 5, 5, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
      <ChartCard title="Solicitudes por urgencia" onClick={onOpenSolicitudes}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={urgencia}
              dataKey="cantidad"
              nameKey="etiqueta"
              innerRadius={55}
              outerRadius={95}
              paddingAngle={2}
            >
              {urgencia.map((item, index) => (
                <Cell key={item.nombre} fill={colores[index % colores.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  )
}
