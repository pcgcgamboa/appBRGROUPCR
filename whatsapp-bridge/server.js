require('dotenv/config')
const express = require('express')
const qrcode = require('qrcode')
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js')

const PORT = process.env.PORT || 3001
const API_KEY = process.env.BRIDGE_API_KEY
const CODIGO_PAIS_DEFECTO = process.env.CODIGO_PAIS_DEFECTO || '506'

if (!API_KEY) {
  console.error(
    'Falta BRIDGE_API_KEY en el .env — sin esto cualquiera podría enviar WhatsApp desde este número. Deteniendo.',
  )
  process.exit(1)
}

// Estado del cliente de WhatsApp, consultado por GET /status y GET /qr.
let estado = 'iniciando'
let qrActual = null

const client = new Client({
  authStrategy: new LocalAuth({ dataPath: './.wwebjs_auth' }),
  puppeteer: { args: ['--no-sandbox', '--disable-setuid-sandbox'] },
})

client.on('qr', (qr) => {
  qrActual = qr
  estado = 'esperando_qr'
  console.log(
    'Escanee el QR: abra GET /qr en el navegador, o corra este proceso con una terminal visible.',
  )
})

client.on('ready', () => {
  qrActual = null
  estado = 'conectado'
  console.log('WhatsApp conectado.')
})

client.on('disconnected', (razon) => {
  estado = 'desconectado'
  console.log('WhatsApp desconectado:', razon)
})

client.initialize()

// Acepta '8888-4444', '88884444', '+506 8888 4444', etc. Antepone el código de país solo cuando
// el número no lo trae ya (heurística: un número local de Costa Rica tiene 8 dígitos).
function normalizarTelefono(telefono) {
  const soloDigitos = String(telefono).replace(/\D/g, '')
  const conCodigo = soloDigitos.length <= 8 ? `${CODIGO_PAIS_DEFECTO}${soloDigitos}` : soloDigitos
  return `${conCodigo}@c.us`
}

const app = express()
app.use(express.json())

app.use((req, res, next) => {
  if (req.header('x-api-key') !== API_KEY)
    return res.status(401).json({ ok: false, error: 'API key inválida.' })
  next()
})

app.get('/status', (_req, res) => {
  res.json({ estado })
})

app.get('/qr', async (_req, res) => {
  if (!qrActual)
    return res.status(404).json({ ok: false, error: 'No hay un QR pendiente de escanear.' })
  const dataUrl = await qrcode.toDataURL(qrActual)
  res.json({ qr: dataUrl })
})

app.post('/send-message', async (req, res) => {
  if (estado !== 'conectado')
    return res.status(409).json({ ok: false, error: 'WhatsApp no está conectado.' })
  const { telefono, mensaje } = req.body ?? {}
  if (!telefono || !mensaje)
    return res.status(400).json({ ok: false, error: 'telefono y mensaje son requeridos.' })
  try {
    await client.sendMessage(normalizarTelefono(telefono), mensaje)
    res.json({ ok: true })
  } catch (error) {
    res
      .status(502)
      .json({ ok: false, error: error instanceof Error ? error.message : 'Error desconocido.' })
  }
})

app.post('/send-document', async (req, res) => {
  if (estado !== 'conectado')
    return res.status(409).json({ ok: false, error: 'WhatsApp no está conectado.' })
  const { telefono, url, nombre_archivo: nombreArchivo, mensaje } = req.body ?? {}
  if (!telefono || !url || !nombreArchivo)
    return res
      .status(400)
      .json({ ok: false, error: 'telefono, url y nombre_archivo son requeridos.' })
  try {
    const respuesta = await fetch(url)
    if (!respuesta.ok)
      throw new Error(`No se pudo descargar el documento (HTTP ${respuesta.status}).`)
    const buffer = Buffer.from(await respuesta.arrayBuffer())
    const mimeType = respuesta.headers.get('content-type') || 'application/octet-stream'
    const media = new MessageMedia(mimeType, buffer.toString('base64'), nombreArchivo)
    await client.sendMessage(
      normalizarTelefono(telefono),
      media,
      mensaje ? { caption: mensaje } : undefined,
    )
    res.json({ ok: true })
  } catch (error) {
    res
      .status(502)
      .json({ ok: false, error: error instanceof Error ? error.message : 'Error desconocido.' })
  }
})

app.listen(PORT, () => {
  console.log(`whatsapp-bridge escuchando en http://localhost:${PORT}`)
})
