import { pdf, PDFViewer } from '@react-pdf/renderer'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/atoms/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/atoms/dialog'
import { Skeleton } from '@/components/atoms/skeleton'
import { usePlantillaReporte } from '@/features/catalogos/hooks/use-plantilla-reporte'
import { useGenerarReportePdf, useUrlFirmadaAdjunto } from '@/features/operador/hooks/use-operador'
import type { ReporteAtencionInput } from '@/features/operador/types/operador.types'
import { normalizarError } from '@/lib/errores'
import {
  ServiceReportPdf,
  type ServiceReportFoto,
  type ServiceReportMaterial,
} from '@/components/organisms/service-report-pdf'

export function ServiceReportPreviewDialog({
  open,
  onClose,
  solicitudId,
  avanceId,
  clienteId,
  numeroSolicitud,
  nombreSolicitud,
  cliente,
  tipoSolicitud,
  equipo,
  operador,
  fecha,
  horasTrabajadas,
  narrativa,
  materiales,
  fotosAdjuntas,
  reporte,
}: {
  open: boolean
  onClose: () => void
  solicitudId: string
  avanceId: string
  clienteId: string | null
  numeroSolicitud: number
  nombreSolicitud: string
  cliente: string
  tipoSolicitud: string
  equipo: {
    nombre: string
    marca: string | null
    modelo: string | null
    serie: string | null
  } | null
  operador: string
  fecha: string
  horasTrabajadas: number
  narrativa: string
  materiales: ServiceReportMaterial[]
  fotosAdjuntas: { ruta_storage: string; categoria?: string | null }[]
  reporte: ReporteAtencionInput
}) {
  const { plantilla } = usePlantillaReporte(clienteId ?? '')
  const urlFirmada = useUrlFirmadaAdjunto()
  const urlFirmadaRef = useRef(urlFirmada.mutateAsync)
  urlFirmadaRef.current = urlFirmada.mutateAsync
  const generarPdf = useGenerarReportePdf()
  const [fotos, setFotos] = useState<ServiceReportFoto[] | null>(null)

  useEffect(() => {
    if (!open) {
      setFotos(null)
      return
    }
    let cancelado = false
    Promise.all(
      fotosAdjuntas.map(async (foto) => ({
        url: await urlFirmadaRef.current(foto.ruta_storage),
        categoria: foto.categoria ?? null,
      })),
    ).then((resueltas) => {
      if (!cancelado) setFotos(resueltas)
    })
    return () => {
      cancelado = true
    }
  }, [open, fotosAdjuntas])

  async function generarYGuardar() {
    if (!fotos) return
    try {
      const blob = await pdf(
        <ServiceReportPdf
          numeroSolicitud={numeroSolicitud}
          nombreSolicitud={nombreSolicitud}
          cliente={cliente}
          tipoSolicitud={tipoSolicitud}
          equipo={equipo}
          operador={operador}
          fecha={fecha}
          horasTrabajadas={horasTrabajadas}
          narrativa={narrativa}
          materiales={materiales}
          fotos={fotos}
          reporte={reporte}
          plantilla={plantilla.data!}
        />,
      ).toBlob()
      await generarPdf.mutateAsync({ solicitudId, avanceId, archivo: blob })
      toast.success('Reporte de atención generado y guardado correctamente.')
      onClose()
    } catch (error) {
      toast.error(normalizarError(error).mensaje)
    }
  }

  const listo = fotos !== null && Boolean(plantilla.data)

  return (
    <Dialog open={open} onOpenChange={(abierto) => !abierto && onClose()}>
      <DialogContent className="w-[min(95vw,60rem)] max-w-none">
        <DialogHeader>
          <DialogTitle>Previsualización del reporte de atención</DialogTitle>
          <DialogDescription>
            Revise el reporte antes de generarlo. El PDF final será exactamente igual a esta vista
            previa.
          </DialogDescription>
        </DialogHeader>
        {listo ? (
          <PDFViewer className="h-[65vh] w-full rounded-lg border">
            <ServiceReportPdf
              numeroSolicitud={numeroSolicitud}
              nombreSolicitud={nombreSolicitud}
              cliente={cliente}
              tipoSolicitud={tipoSolicitud}
              equipo={equipo}
              operador={operador}
              fecha={fecha}
              horasTrabajadas={horasTrabajadas}
              narrativa={narrativa}
              materiales={materiales}
              fotos={fotos}
              reporte={reporte}
              plantilla={plantilla.data!}
            />
          </PDFViewer>
        ) : (
          <Skeleton className="h-[65vh] w-full" />
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cerrar sin generar
          </Button>
          <Button onClick={generarYGuardar} disabled={!listo || generarPdf.isPending}>
            {generarPdf.isPending ? 'Generando…' : 'Generar y guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
