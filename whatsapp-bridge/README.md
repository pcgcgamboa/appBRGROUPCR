# whatsapp-bridge

**Este servicio es opcional.** El sistema ya puede enviar WhatsApp sin nada de lo que sigue en este
archivo, usando el método "Abrir WhatsApp (clic para chatear)" del panel de envío: arma un enlace
`wa.me` con el mensaje ya escrito y lo abre para que la persona presione Enviar — sin bridge, sin
sesión 24/7, sin túnel, sin riesgo de bloqueo del número. Solo hace falta seguir esta guía si además
se quiere la opción "Automático", que envía sin que nadie tenga que presionar Enviar.

Servicio local que mantiene una sesión de WhatsApp Web (vía `whatsapp-web.js`) y expone una API
HTTP interna para que el Edge Function `enviar-whatsapp` del sistema principal pueda enviar
mensajes y documentos por WhatsApp de forma automática.

**Importante**: `whatsapp-web.js` automatiza el cliente web de WhatsApp de forma no oficial (no es
la API de Meta Business). Esto viola los términos de servicio de WhatsApp y existe un riesgo real
de que el número quede bloqueado, sobre todo con volumen alto de envíos. Úselo con un número que
pueda permitirse perder, no con el número principal de atención al cliente si eso es crítico para
el negocio.

Este servicio debe quedar corriendo permanentemente (24/7) en la máquina que elija — si se apaga o
pierde internet, el envío de WhatsApp deja de funcionar hasta que se reinicie.

## 1. Instalación

Requiere Node.js 18 o superior.

```
cd whatsapp-bridge
npm install
cp .env.example .env
```

Edite `.env` y genere un `BRIDGE_API_KEY` propio, por ejemplo:

```
openssl rand -hex 32
```

(En Windows sin `openssl`, puede generar un valor aleatorio largo con
`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.)

## 2. Primer arranque — escanear el QR

```
npm start
```

La consola mostrará `Escanee el QR...`. Con el servicio corriendo, abra en el navegador:

```
http://localhost:3001/qr
```

(reemplace el puerto si cambió `PORT` en `.env`). Esa ruta devuelve un JSON con el QR como imagen
en base64 (`{"qr": "data:image/png;base64,..."}") — péguelo en la barra de direcciones de un
navegador, o ábralo con cualquier visor de imágenes base64, y escanéelo con la app de WhatsApp del
teléfono que va a usar el sistema (Ajustes → Dispositivos vinculados → Vincular un dispositivo).

Una vez escaneado, la consola mostrará `WhatsApp conectado.` y la sesión queda guardada en
`.wwebjs_auth/` — los siguientes arranques (`npm start`) no van a pedir QR de nuevo mientras esa
carpeta exista y la sesión no se cierre desde el teléfono.

Verifique el estado en cualquier momento con:

```
curl -H "x-api-key: <su BRIDGE_API_KEY>" http://localhost:3001/status
```

## 3. Exponerlo a internet (requerido para que Supabase pueda llamarlo)

Los Edge Functions de Supabase corren en la nube, no en su red local — necesitan una URL HTTPS
pública para llegar a este servicio. La forma más simple y gratuita es un túnel:

```
# con ngrok (https://ngrok.com, cuenta gratuita)
ngrok http 3001
```

Copie la URL `https://xxxx.ngrok-free.app` que le entrega. Esa URL cambia cada vez que reinicia
ngrok en el plan gratuito — cuando cambie, hay que actualizar el secret en Supabase (paso 4). Si
esto se vuelve una molestia, considere una cuenta paga de ngrok (dominio fijo) o Cloudflare Tunnel
con un dominio propio.

## 4. Conectar con Supabase

Desde la raíz del proyecto principal (`c:\Proyectos`, no aquí):

```
supabase secrets set WHATSAPP_BRIDGE_URL=https://xxxx.ngrok-free.app WHATSAPP_BRIDGE_API_KEY=<el mismo BRIDGE_API_KEY de arriba>
```

Repita ese comando cada vez que cambie la URL del túnel.

## Endpoints

Todas las rutas exigen el header `x-api-key: <BRIDGE_API_KEY>`.

- `GET /status` → `{ "estado": "iniciando" | "esperando_qr" | "conectado" | "desconectado" }`
- `GET /qr` → `{ "qr": "data:image/png;base64,..." }` (404 si no hay QR pendiente)
- `POST /send-message` — body `{ "telefono": "88884444", "mensaje": "Hola" }`
- `POST /send-document` — body `{ "telefono": "88884444", "url": "<signed URL>", "nombre_archivo": "contrato.pdf" }`
