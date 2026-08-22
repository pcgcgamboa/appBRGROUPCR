// Log estructurado en JSON por línea, sin dependencia de ningún proveedor externo — Supabase ya
// captura stdout/stderr de cada Edge Function en su propio explorador de logs (Dashboard →
// Edge Functions → Logs), así que un `console.error`/`console.log` con forma JSON consistente ya
// es buscable/filtrable por `correlacion_id` o `funcion` sin contratar nada nuevo. Elegir un
// proveedor de métricas/trazas dedicado (Sentry, Datadog, Grafana Cloud, etc.) sigue siendo una
// decisión de negocio aparte — ver docs/informe-arquitectura-fase-4.md.

type NivelLog = 'info' | 'warn' | 'error'

interface CamposLog {
  funcion: string
  correlacion_id: string
  [clave: string]: unknown
}

function emitir(nivel: NivelLog, mensaje: string, campos: CamposLog) {
  const linea = JSON.stringify({
    nivel,
    mensaje,
    ...campos,
    marca_tiempo: new Date().toISOString(),
  })
  if (nivel === 'error') console.error(linea)
  else if (nivel === 'warn') console.warn(linea)
  else console.log(linea)
}

export function logError(mensaje: string, campos: CamposLog) {
  emitir('error', mensaje, campos)
}

export function logInfo(mensaje: string, campos: CamposLog) {
  emitir('info', mensaje, campos)
}
