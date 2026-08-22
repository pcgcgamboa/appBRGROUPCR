# Informe — Fase 4 de la propuesta de arquitectura escalable

**Fecha:** 22 de agosto de 2026
**Alcance:** Fase 4 ("Observabilidad y continuidad") de
`Propuesta_Arquitectura_Escalable_React_Supabase.md`, continuación de
`docs/informe-arquitectura-fase-3.md`.

---

## 1. Resumen ejecutivo

La propuesta original agrupa esta fase en dos ítems: "logs estructurados, métricas, trazas
correlacionadas" y "simulacros de restauración". `docs/informe-arquitectura-fase-1.md` §5 ya había
señalado que esta fase "requiere elegir y contratar un proveedor de observabilidad — decisión de
negocio, no de código". Esa conclusión sigue siendo correcta para un panel de métricas/alertas real
o trazas distribuidas — pero al revisar el código se encontró un vacío concreto que **sí** es
resoluble sin ningún proveedor externo: ninguno de los Edge Functions críticos dejaba rastro alguno
en los logs del propio Supabase cuando fallaban.

| Elemento | Estado |
|---|---|
| Logs estructurados (JSON) en los `catch` de `gestionar-solicitud`, `registrar-avance`, `admin-users` | ✅ Hecho — antes el error solo viajaba en la respuesta HTTP, nunca se registraba en el servidor |
| `correlacion_id` propagado hasta el envío de notificaciones en segundo plano (`notificarEnSegundoPlano`, `enviarNotificacionPendiente`) | ✅ Hecho — un fallo de SMTP o de inicio de notificación ahora es rastreable con el mismo id que la operación de negocio que lo originó |
| Logs estructurados en el worker de outbox (`procesar-notificaciones-pendientes`, disparado por `pg_cron`) | ✅ Hecho, más un log de éxito por lote — la única forma previa de saber si el cron seguía vivo era notar que `notificaciones_envios` dejaba de moverse |
| Runbook de simulacro de restauración de respaldo | ✅ Documentado (`docs/runbook-restauracion-respaldo.md`) — **no ejecutado**, requiere crear un proyecto Supabase de prueba y presencia humana en la consola (ver razones en el propio runbook) |
| Métricas/dashboards con alertas, trazas distribuidas (APM) | ⏸️ Diferido — requiere contratar un proveedor externo (Sentry, Datadog, Grafana Cloud, etc.), decisión de negocio y de presupuesto que no le corresponde a un agente de código |

### Verificación

| Verificación | Resultado |
|---|---|
| `npx tsc -b` (frontend, `src/`) | ✅ Sin errores — el cambio de esta fase es 100% Edge Functions (Deno), fuera del proyecto de `tsc` (`tsconfig.app.json` solo incluye `src`) |
| `npm run lint` | ✅ 0 errores (1 warning preexistente sin relación) |
| `npm run format:check` | ✅ Limpio |
| `npm run build` | ✅ Exitoso, sin cambios de bundle (Edge Functions no forman parte del build de Vite) |
| `npm run test` (Vitest) | ✅ 14/14 |
| `npm run test:e2e` (Playwright) | ✅ 2/2 |
| Revisión manual línea por línea de los 5 archivos de `supabase/functions` modificados | ✅ Sin `deno check` disponible en este entorno (no hay binario de Deno instalado), se verificó por lectura completa que las firmas de función siguen siendo compatibles con todos sus llamadores (parámetro `correlacionId` agregado como opcional y al final, nunca insertado en medio de una firma existente) |

**Limitación honesta**: no hay Deno instalado en este entorno, así que estos 5 archivos no se
verificaron con un type-checker real, solo por revisión manual — mismo tipo de limitación ya
señalada para otros cambios de Edge Functions en fases anteriores. No se despliega (`supabase
functions deploy`) por instrucción explícita del usuario; el despliegue queda como su paso manual.

---

## 2. Logs estructurados

### Diagnóstico

Se revisó cada `catch` de los tres Edge Functions con lógica de negocio
(`gestionar-solicitud`, `registrar-avance`, `admin-users`): los tres devuelven el mensaje de error al
cliente vía la respuesta HTTP (con `correlacion_id` incluido desde la Fase 2), pero **ninguno
imprime nada en el servidor**. Sin un `console.error`, Supabase → Edge Functions → Logs no muestra
absolutamente nada cuando una de estas funciones falla — la única visibilidad existente era que el
propio usuario reportara el error y pegara el `correlacion_id` de su respuesta, que hoy no se puede
buscar en ningún lado porque nunca se registró del lado del servidor.

El único `console.error` preexistente en todo `supabase/functions` estaba en
`notificarEnSegundoPlano` (`_shared/notificaciones.ts`), sin estructura ni `correlacion_id`.

### Cambio

`supabase/functions/_shared/logger.ts` (nuevo): dos funciones, `logError`/`logInfo`, que imprimen
una línea JSON (`{ nivel, mensaje, funcion, correlacion_id, ...campos extra, marca_tiempo }`) a
`console.error`/`console.log` respectivamente. Sin dependencias externas — Supabase ya captura
stdout/stderr de cada función en su propio explorador de logs, así que esto es inmediatamente útil
sin ninguna pieza de infraestructura nueva ni decisión de proveedor.

Se aplicó en:
- Los 3 `catch` de nivel superior de `gestionar-solicitud`, `registrar-avance`, `admin-users` — cada
  uno con `funcion` y el `correlacion_id` ya generado al inicio del handler (Fase 2).
- El `catch` de `enviarNotificacionPendiente` (envío SMTP en segundo plano) — antes solo actualizaba
  `notificaciones_envios.resultado = 'error'` en la base, sin ningún rastro en logs; ahora también
  registra un log estructurado, útil porque ese error ocurre después de que la respuesta HTTP de la
  operación de negocio ya se envió (nadie lo ve si no se busca activamente en la base).
- El `catch` de `notificarEnSegundoPlano` — reemplaza el único `console.error(error)` sin estructura
  que ya existía.
- El worker de outbox `procesar-notificaciones-pendientes` (disparado por `pg_cron` cada 5 minutos,
  Fase 2): antes no registraba nada ni en éxito ni en error. Ahora genera su propio
  `correlacion_id` por corrida, registra un `logError` si `reclamar_notificaciones_pendientes` falla,
  y un `logInfo` con la cantidad procesada al terminar cada lote — la única forma previa de confirmar
  que el cron seguía vivo era notar que `notificaciones_envios` dejaba de moverse.

### `correlacion_id` extendido hasta las notificaciones en segundo plano

`notificarEnSegundoPlano` y `enviarNotificacionPendiente` ganaron un tercer parámetro opcional
`correlacionId?: string` (cambio de firma en TypeScript, no en una función de Postgres — no aplica el
riesgo de sobrecarga de `CREATE OR REPLACE FUNCTION` documentado en `docs/informe-arquitectura-fase-2.md`;
un parámetro opcional al final de una función TS es compatible hacia atrás con todos los llamadores
existentes). Los 5 puntos de invocación en `gestionar-solicitud`/`registrar-avance` ahora pasan su
propio `correlacionId`; `procesar-notificaciones-pendientes` pasa el suyo propio. El resultado: un
fallo de envío de correo ahora se puede correlacionar con la invocación de la Edge Function (o la
corrida del cron) que lo originó, con el mismo id — sin necesidad de tocar la base de datos ni de
convertir ninguna llamada directa en RPC (a diferencia de lo que hubiera requerido extender
`correlacion_id` hasta `automatizacion_ejecuciones`, ya resuelto de otra forma en la Fase 2).

**Alcance no cubierto**: `notificaciones_envios` en sí (la tabla) sigue sin una columna
`correlacion_id` — el log estructurado correlaciona en el explorador de logs, no en SQL. Agregar esa
columna es un cambio aditivo de bajo riesgo, pero se dejó fuera de esta fase para no repetir un tercer
cambio de esquema sobre la misma tabla en una sola sesión sin evidencia de que se necesite consultar
esa correlación desde SQL en vez de desde los logs.

---

## 3. Runbook de simulacro de restauración

`docs/runbook-restauracion-respaldo.md` (nuevo) documenta el procedimiento completo: confirmar plan
de respaldos/PITR, crear un proyecto Supabase aislado para el simulacro, restaurar sobre él, verificar
integridad de datos y RLS, ejercer flujos críticos del frontend contra el proyecto restaurado,
registrar el resultado, y eliminar el proyecto de prueba.

**No se ejecutó** en esta sesión — crear un proyecto Supabase adicional y restaurar un respaldo sobre
él tiene efectos reales fuera de este repositorio (posible costo, tiempo, acceso a consola) que
requieren autorización y presencia humana explícitas, no delegables a un agente de código en este
entorno. El runbook deja documentado qué haría falta y por qué, siguiendo el mismo patrón ya usado en
fases anteriores para ítems que dependen de una decisión o acceso que el usuario debe proveer.

---

## 4. Ítems diferidos (con razonamiento)

### 4.1 Métricas y dashboards con alertas

Contar/graficar tasas de error, latencia p95, SLA vencidos, etc. de forma que alguien reciba una
alerta activa (no solo pueda consultarlo si se le ocurre buscar) requiere o bien un proveedor externo
(Sentry, Datadog, Grafana Cloud/Grafana Alloy, New Relic...) o construir un panel propio sobre
Postgres — ambas opciones tienen costo/tiempo de mantenimiento y ninguna es la "correcta" sin que el
negocio decida presupuesto, retención de métricas deseada y a quién le llegan las alertas. La
propuesta original ya lo marca como decisión de negocio; los logs estructurados agregados en esta
fase son un piso razonable mientras esa decisión no se tome (ya son buscables/filtrables por
`correlacion_id` y `funcion` en Supabase → Edge Functions → Logs, sin costo adicional).

### 4.2 Trazas distribuidas (APM)

Mismo razonamiento que 4.1: requiere instrumentación con un SDK de un proveedor de APM y, típicamente,
un servicio pago para almacenar/consultar las trazas. El `correlacion_id` ya presente (Fase 2, extendido
en esta fase) cubre la necesidad más común — cruzar una respuesta de error del cliente con su rastro en
logs y en `automatizacion_ejecuciones` — sin necesitar tracing distribuido completo todavía.

---

## 5. Archivos nuevos y modificados

**Nuevos**: `supabase/functions/_shared/logger.ts`, `docs/runbook-restauracion-respaldo.md`, este
informe.

**Modificados**: `supabase/functions/gestionar-solicitud/index.ts`,
`supabase/functions/registrar-avance/index.ts`, `supabase/functions/admin-users/index.ts`,
`supabase/functions/_shared/notificaciones.ts`, `supabase/functions/procesar-notificaciones-pendientes/index.ts`.
