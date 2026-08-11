import { CircleMarker, MapContainer, TileLayer, Tooltip, useMap } from 'react-leaflet'
import { useEffect } from 'react'

function MapUpdater({ latitude, longitude }: { latitude: number; longitude: number }) {
  const map = useMap()
  useEffect(() => {
    map.setView([latitude, longitude], 15)
  }, [latitude, longitude, map])
  return null
}

export function LocationMap({
  latitude,
  longitude,
  label,
}: {
  latitude: number | null
  longitude: number | null
  label: string
}) {
  if (latitude === null || longitude === null)
    return (
      <div className="grid h-72 place-items-center rounded-lg border bg-muted text-center text-sm text-muted-foreground">
        Ingrese latitud y longitud para visualizar la ubicación.
      </div>
    )
  return (
    <div className="h-72 overflow-hidden rounded-lg border">
      <MapContainer
        center={[latitude, longitude]}
        zoom={15}
        className="h-full w-full"
        scrollWheelZoom
      >
        <MapUpdater latitude={latitude} longitude={longitude} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <CircleMarker
          center={[latitude, longitude]}
          radius={10}
          pathOptions={{ color: '#1d4ed8', fillColor: '#3b82f6', fillOpacity: 0.8 }}
        >
          <Tooltip permanent direction="top">
            {label}
          </Tooltip>
        </CircleMarker>
      </MapContainer>
    </div>
  )
}
