import { LoaderCircle, MapPin, Search } from 'lucide-react'
import { type KeyboardEvent, useEffect, useState } from 'react'
import { CircleMarker, MapContainer, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet'
import { Button } from '@/components/atoms/button'
import { Input } from '@/components/atoms/input'

const centroCostaRica: [number, number] = [9.7489, -83.7534]
const limitesCostaRica: [[number, number], [number, number]] = [
  [8.0, -86.3],
  [11.3, -82.2],
]

interface ResultadoBusqueda {
  place_id: number
  display_name: string
  lat: string
  lon: string
}

const cacheBusqueda = new Map<string, ResultadoBusqueda[]>()
let ultimaBusqueda = 0

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
  const [consulta, setConsulta] = useState('')
  const [resultados, setResultados] = useState<ResultadoBusqueda[]>([])
  const [buscando, setBuscando] = useState(false)
  const [errorBusqueda, setErrorBusqueda] = useState<string | null>(null)

  async function buscarUbicacion() {
    const texto = consulta.trim()
    if (!texto || !onLocationChange) return
    setErrorBusqueda(null)
    const clave = texto.toLocaleLowerCase('es')
    const almacenados = cacheBusqueda.get(clave)
    if (almacenados) {
      setResultados(almacenados)
      return
    }
    if (Date.now() - ultimaBusqueda < 1_000) {
      setErrorBusqueda('Espere un momento antes de realizar otra búsqueda.')
      return
    }

    setBuscando(true)
    ultimaBusqueda = Date.now()
    try {
      const parametros = new URLSearchParams({
        q: texto,
        format: 'jsonv2',
        countrycodes: 'cr',
        limit: '5',
        addressdetails: '1',
        'accept-language': 'es',
      })
      const respuesta = await fetch(`https://nominatim.openstreetmap.org/search?${parametros}`)
      if (!respuesta.ok) throw new Error('No fue posible consultar el servicio de mapas.')
      const datos = (await respuesta.json()) as ResultadoBusqueda[]
      cacheBusqueda.set(clave, datos)
      setResultados(datos)
      if (!datos.length) setErrorBusqueda('No se encontraron lugares en Costa Rica.')
    } catch (error) {
      setErrorBusqueda(
        error instanceof Error ? error.message : 'No fue posible buscar la ubicación.',
      )
    } finally {
      setBuscando(false)
    }
  }

  function manejarTecla(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault()
      void buscarUbicacion()
    }
  }

  if ((latitude === null || longitude === null) && !selectable)
    return (
      <div className="grid h-72 place-items-center rounded-lg border bg-muted text-center text-sm text-muted-foreground">
        Ingrese latitud y longitud para visualizar la ubicación.
      </div>
    )

  const seleccionada = latitude !== null && longitude !== null
  return (
    <div className="space-y-3">
      {selectable && onLocationChange && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              type="search"
              value={consulta}
              placeholder="Ej. Liceo Unesco, Pérez Zeledón"
              aria-label="Buscar lugar o dirección en Costa Rica"
              onChange={(event) => setConsulta(event.target.value)}
              onKeyDown={manejarTecla}
            />
            <Button
              type="button"
              className="shrink-0"
              disabled={buscando || !consulta.trim()}
              onClick={() => void buscarUbicacion()}
            >
              {buscando ? (
                <LoaderCircle className="mr-2 size-4 animate-spin" />
              ) : (
                <Search className="mr-2 size-4" />
              )}
              Buscar
            </Button>
          </div>
          {errorBusqueda && (
            <p role="status" className="text-sm text-warning">
              {errorBusqueda}
            </p>
          )}
          {resultados.length > 0 && (
            <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
              {resultados.map((resultado) => (
                <button
                  key={resultado.place_id}
                  type="button"
                  className="flex w-full items-start gap-2 border-b px-3 py-2 text-left text-sm transition last:border-b-0 hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
                  onClick={() => {
                    onLocationChange(Number(resultado.lat), Number(resultado.lon))
                    setConsulta(resultado.display_name)
                    setResultados([])
                  }}
                >
                  <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>{resultado.display_name}</span>
                </button>
              ))}
            </div>
          )}
          <p className="text-[11px] text-muted-foreground">
            Búsqueda provista por{' '}
            <a
              href="https://nominatim.openstreetmap.org/"
              target="_blank"
              rel="noreferrer"
              className="underline hover:text-foreground"
            >
              Nominatim / OpenStreetMap
            </a>
          </p>
        </div>
      )}
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
    </div>
  )
}
