import { Eraser } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/atoms/button'

export function SignaturePad({
  value,
  onChange,
  label,
}: {
  value: string
  onChange: (dataUrl: string) => void
  label: string
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const dibujandoRef = useRef(false)
  const [vacio, setVacio] = useState(!value)

  // Redimensiona el canvas a su tamaño real en pantalla (CSS lo estira, pero el buffer de dibujo
  // necesita su propia resolución) antes de restaurar una firma ya capturada.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const relacion = window.devicePixelRatio || 1
    canvas.width = canvas.clientWidth * relacion
    canvas.height = canvas.clientHeight * relacion
    const contexto = canvas.getContext('2d')
    if (!contexto) return
    contexto.scale(relacion, relacion)
    contexto.lineWidth = 2
    contexto.lineCap = 'round'
    contexto.strokeStyle = '#0f172a'
    if (value) {
      const imagen = new Image()
      imagen.onload = () =>
        contexto.drawImage(imagen, 0, 0, canvas.clientWidth, canvas.clientHeight)
      imagen.src = value
    }
  }, [value])

  function posicion(event: React.PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect()
    return { x: event.clientX - rect.left, y: event.clientY - rect.top }
  }

  function iniciar(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current
    const contexto = canvas?.getContext('2d')
    if (!contexto) return
    dibujandoRef.current = true
    const { x, y } = posicion(event)
    contexto.beginPath()
    contexto.moveTo(x, y)
  }

  function dibujar(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!dibujandoRef.current) return
    const contexto = canvasRef.current?.getContext('2d')
    if (!contexto) return
    const { x, y } = posicion(event)
    contexto.lineTo(x, y)
    contexto.stroke()
    setVacio(false)
  }

  function finalizar() {
    if (!dibujandoRef.current) return
    dibujandoRef.current = false
    const canvas = canvasRef.current
    if (canvas) onChange(canvas.toDataURL('image/png'))
  }

  function limpiar() {
    const canvas = canvasRef.current
    const contexto = canvas?.getContext('2d')
    if (!canvas || !contexto) return
    contexto.clearRect(0, 0, canvas.width, canvas.height)
    setVacio(true)
    onChange('')
  }

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <Button type="button" variant="outline" size="sm" onClick={limpiar}>
          <Eraser className="mr-2 size-3.5" />
          Limpiar
        </Button>
      </div>
      <canvas
        ref={canvasRef}
        className="h-32 w-full touch-none rounded-lg border bg-white"
        onPointerDown={iniciar}
        onPointerMove={dibujar}
        onPointerUp={finalizar}
        onPointerLeave={finalizar}
      />
      {vacio && <p className="text-xs text-muted-foreground">Firme con el dedo o el mouse.</p>}
    </div>
  )
}
