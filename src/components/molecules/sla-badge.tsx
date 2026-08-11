import { Badge } from '@/components/atoms/badge'

export function SlaBadge({
  venceEn,
  estado,
  prioridad,
}: {
  venceEn: string | null
  estado: string
  prioridad: string | null
}) {
  if (!venceEn) return <Badge>Sin calcular</Badge>
  const finalizada = ['atendida', 'cerrada', 'cancelada', 'rechazada'].includes(estado)
  const vencida = !finalizada && new Date(venceEn).getTime() < Date.now()
  const horas = Math.ceil((new Date(venceEn).getTime() - Date.now()) / 3_600_000)
  return (
    <Badge
      className={
        vencida
          ? 'bg-red-100 text-red-800'
          : prioridad === 'urgente'
            ? 'bg-amber-100 text-amber-900'
            : ''
      }
    >
      {vencida ? 'SLA vencido' : finalizada ? 'Finalizada' : `${Math.max(0, horas)} h restantes`}
    </Badge>
  )
}
