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

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="min-w-0 rounded-lg border bg-white p-4 shadow-sm sm:p-5">
      <h2 className="mb-5 font-semibold">{title}</h2>
      <div className="h-80">{children}</div>
    </section>
  )
}

export function DashboardCharts({ data }: { data: DashboardSolicitudes }) {
  const estados = data.por_estado.map((item) => ({ ...item, etiqueta: etiqueta(item.nombre) }))
  const prioridades = data.por_prioridad.map((item) => ({
    ...item,
    etiqueta: etiqueta(item.nombre),
  }))
  const urgencia = data.por_urgencia.map((item) => ({ ...item, etiqueta: etiqueta(item.nombre) }))
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <ChartCard title="Solicitudes por estado">
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
      <ChartCard title="Solicitudes por prioridad">
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
      <ChartCard title="Solicitudes por urgencia">
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
