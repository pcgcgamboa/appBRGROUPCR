import { useEffect } from 'react'
import { CircleMarker, MapContainer, Popup, TileLayer, Tooltip, useMap } from 'react-leaflet'
import { Button } from '@/components/atoms/button'
import type { SolicitudAdmin } from '@/features/solicitudes/types/solicitudes.types'

const centroCostaRica: [number, number] = [9.7489, -83.7534]
const estadosActivos = new Set([
  'creada',
  'asignada',
  'en_atencion',
  'en_espera_materiales',
  'atendida',
])

const colores: Record<string, string> = {
  creada: '#64748b',
  asignada: '#2563eb',
  en_atencion: '#0f766e',
  en_espera_materiales: '#d97706',
  atendida: '#7c3aed',
}

interface PuntoSolicitud {
  solicitud: SolicitudAdmin
  latitud: number
  longitud: number
}

function AjustarVista({ puntos }: { puntos: PuntoSolicitud[] }) {
  const map = useMap()
  useEffect(() => {
    if (!puntos.length) {
      map.setView(centroCostaRica, 8)
      return
    }
    map.fitBounds(
      puntos.map((punto) => [punto.latitud, punto.longitud] as [number, number]),
      { padding: [40, 40], maxZoom: 15 },
    )
  }, [map, puntos])
  return null
}

export function SolicitudesMap({
  solicitudes,
  onSelect,
}: {
  solicitudes: SolicitudAdmin[]
  onSelect: (solicitud: SolicitudAdmin) => void
}) {
  const activas = solicitudes.filter((solicitud) => estadosActivos.has(solicitud.estado))
  const puntos = activas.flatMap((solicitud): PuntoSolicitud[] => {
    const latitud = solicitud.ruta?.latitud ?? solicitud.ubicacion?.latitud
    const longitud = solicitud.ruta?.longitud ?? solicitud.ubicacion?.longitud
    return latitud === null || latitud === undefined || longitud === null || longitud === undefined
      ? []
      : [{ solicitud, latitud, longitud }]
  })
  const sinCoordenadas = activas.length - puntos.length

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <p className="font-medium">
          {puntos.length}{' '}
          {puntos.length === 1 ? 'solicitud activa ubicada' : 'solicitudes activas ubicadas'}
        </p>
        {sinCoordenadas > 0 && (
          <p className="text-amber-700">
            {sinCoordenadas} {sinCoordenadas === 1 ? 'solicitud no tiene' : 'solicitudes no tienen'}{' '}
            coordenadas.
          </p>
        )}
      </div>
      <div className="h-[min(68vh,620px)] min-h-96 overflow-hidden rounded-xl border bg-white shadow-sm">
        <MapContainer center={centroCostaRica} zoom={8} className="h-full w-full" scrollWheelZoom>
          <AjustarVista puntos={puntos} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {puntos.map(({ solicitud, latitud, longitud }) => (
            <CircleMarker
              key={solicitud.id}
              center={[latitud, longitud]}
              radius={10}
              pathOptions={{
                color: colores[solicitud.estado] ?? '#1d4ed8',
                fillColor: colores[solicitud.estado] ?? '#3b82f6',
                fillOpacity: 0.85,
              }}
            >
              <Tooltip>
                #{solicitud.numero} · {solicitud.nombre}
              </Tooltip>
              <Popup minWidth={250}>
                <div className="space-y-2">
                  <div>
                    <p className="font-semibold">
                      #{solicitud.numero} · {solicitud.nombre}
                    </p>
                    <p className="text-sm text-slate-600">{solicitud.cliente?.nombre}</p>
                  </div>
                  <dl className="grid grid-cols-[auto_1fr] gap-x-2 text-xs">
                    <dt className="font-semibold">Estado:</dt>
                    <dd>{solicitud.estado.replace(/_/g, ' ')}</dd>
                    <dt className="font-semibold">Ubicación:</dt>
                    <dd>
                      {solicitud.ubicacion
                        ? `${solicitud.ubicacion.nombre}, ${solicitud.ubicacion.canton}`
                        : 'Sin detalle'}
                    </dd>
                  </dl>
                  <Button className="h-9 w-full" onClick={() => onSelect(solicitud)}>
                    Gestionar solicitud
                  </Button>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>
    </section>
  )
}
