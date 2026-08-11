import { AlertTriangle, ClipboardList, Clock3, RefreshCw } from 'lucide-react'
import { Button } from '@/components/atoms/button'
import { MetricCard } from '@/components/molecules/metric-card'
import { PageHeader } from '@/components/molecules/page-header'
import { DashboardCharts } from '@/components/organisms/dashboard-charts'
import { useDashboardSolicitudes } from '@/features/reportes/hooks/use-dashboard'

export function ReportesPage({ onOpenSolicitudes }: { onOpenSolicitudes?: () => void }) {
  const dashboard = useDashboardSolicitudes()
  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          title="Reportes y dashboard"
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
        <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800">
          {dashboard.error.message}
        </p>
      )}
      {dashboard.isLoading && (
        <p className="rounded-lg border bg-white p-8 text-center text-sm text-muted-foreground">
          Preparando indicadores…
        </p>
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
