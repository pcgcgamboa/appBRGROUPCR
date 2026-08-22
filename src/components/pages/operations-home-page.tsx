import { AlertTriangle, ClipboardList, Clock3, RefreshCw } from 'lucide-react'
import { Button } from '@/components/atoms/button'
import { Skeleton } from '@/components/atoms/skeleton'
import { MetricCard } from '@/components/molecules/metric-card'
import { PageHeader } from '@/components/molecules/page-header'
import { DashboardCharts } from '@/components/organisms/dashboard-charts'
import { useDashboardSolicitudes } from '@/features/reportes/hooks/use-dashboard'

export function OperationsHomePage({ onOpenSolicitudes }: { onOpenSolicitudes: () => void }) {
  const dashboard = useDashboardSolicitudes()

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          title="Inicio"
          description="Panorama operativo por estado, prioridad, urgencia y cumplimiento del SLA."
        />
        <Button
          variant="outline"
          disabled={dashboard.isFetching}
          onClick={() => void dashboard.refetch()}
        >
          <RefreshCw
            className={dashboard.isFetching ? 'mr-2 size-4 animate-spin' : 'mr-2 size-4'}
          />
          Actualizar
        </Button>
      </div>
      {dashboard.error && (
        <p
          role="alert"
          className="rounded-md bg-destructive-soft p-3 text-sm text-destructive-soft-foreground"
        >
          {dashboard.error.message}
        </p>
      )}
      {dashboard.isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="space-y-3 rounded-lg border bg-card p-5 shadow-sm">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-8 w-1/3" />
            </div>
          ))}
        </div>
      )}
      {dashboard.data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Solicitudes totales"
              value={dashboard.data.totales.total}
              icon={ClipboardList}
              onClick={onOpenSolicitudes}
            />
            <MetricCard
              label="Solicitudes activas"
              value={dashboard.data.totales.activas}
              icon={Clock3}
              onClick={onOpenSolicitudes}
            />
            <MetricCard
              label="Solicitudes urgentes"
              value={dashboard.data.totales.urgentes}
              icon={AlertTriangle}
              onClick={onOpenSolicitudes}
            />
            <MetricCard
              label="SLA vencidas"
              value={dashboard.data.totales.sla_vencidas}
              icon={AlertTriangle}
              alert
              onClick={onOpenSolicitudes}
            />
          </div>
          <DashboardCharts data={dashboard.data} onOpenSolicitudes={onOpenSolicitudes} />
        </>
      )}
    </section>
  )
}
