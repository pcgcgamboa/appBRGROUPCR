import { useEffect } from 'react'
import { CircleMarker, MapContainer, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet'

const centroCostaRica: [number, number] = [9.7489, -83.7534]
const limitesCostaRica: [[number, number], [number, number]] = [
  [8.0, -86.3],
  [11.3, -82.2],
]

function MapUpdater({ latitude, longitude }: { latitude: number; longitude: number }) {
  const map = useMap()
  useEffect(() => {
    map.setView([latitude, longitude], 15)
  }, [latitude, longitude, map])
  return null
}

function MapSelector({
  onLocationChange,
}: {
  onLocationChange: (latitude: number, longitude: number) => void
}) {
  useMapEvents({
    click(event) {
      onLocationChange(Number(event.latlng.lat.toFixed(6)), Number(event.latlng.lng.toFixed(6)))
    },
  })
  return null
}

export function LocationMap({
  latitude,
  longitude,
  label,
  selectable = false,
  onLocationChange,
}: {
  latitude: number | null
  longitude: number | null
  label: string
  selectable?: boolean
  onLocationChange?: (latitude: number, longitude: number) => void
}) {
  if ((latitude === null || longitude === null) && !selectable)
    return (
      <div className="grid h-72 place-items-center rounded-lg border bg-muted text-center text-sm text-muted-foreground">
        Ingrese latitud y longitud para visualizar la ubicación.
      </div>
    )

  const seleccionada = latitude !== null && longitude !== null
  return (
    <div className="h-80 overflow-hidden rounded-xl border shadow-sm">
      <MapContainer
        center={seleccionada ? [latitude, longitude] : centroCostaRica}
        zoom={seleccionada ? 15 : 8}
        minZoom={7}
        maxBounds={limitesCostaRica}
        maxBoundsViscosity={0.8}
        className={`h-full w-full ${selectable ? 'cursor-crosshair' : ''}`}
        scrollWheelZoom
      >
        {seleccionada && <MapUpdater latitude={latitude} longitude={longitude} />}
        {selectable && onLocationChange && <MapSelector onLocationChange={onLocationChange} />}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {seleccionada && (
          <CircleMarker
            center={[latitude, longitude]}
            radius={10}
            pathOptions={{ color: '#1d4ed8', fillColor: '#3b82f6', fillOpacity: 0.8 }}
          >
            <Tooltip permanent direction="top">
              {label}
            </Tooltip>
          </CircleMarker>
        )}
      </MapContainer>
    </div>
  )
}
