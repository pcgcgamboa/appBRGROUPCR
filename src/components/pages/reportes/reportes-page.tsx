import { RefreshCw } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/atoms/button'
import { PageHeader } from '@/components/molecules/page-header'
import { FleetReports } from '@/components/organisms/fleet-reports'
import { MaterialCostReports } from '@/components/organisms/material-cost-reports'

export function ReportesPage() {
  const queryClient = useQueryClient()

  async function actualizarReportes() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['reporte-costos-materiales'] }),
      queryClient.invalidateQueries({ queryKey: ['reporte-flota'] }),
    ])
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          title="Reportes"
          description="Análisis detallado de costos de materiales y operación de la flota."
        />
        <Button variant="outline" onClick={() => void actualizarReportes()}>
          <RefreshCw className="mr-2 size-4" />
          Actualizar
        </Button>
      </div>
      <MaterialCostReports />
      <FleetReports />
    </section>
  )
}
