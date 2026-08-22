# Informe — Fase 1 (continuación) e inicio de Fase 2

**Fecha:** 22 de agosto de 2026
**Alcance:** continuación de `docs/informe-arquitectura-fase-1.md` — extensión de puertos/adaptadores
a los 10 dominios restantes de `src/features/**`, más dos ítems concretos de Fase 2 ("Integración
segura"): normalización de errores y desacople del envío de notificaciones del camino crítico.

---

## 1. Resumen ejecutivo

| Elemento | Estado |
|---|---|
| Puertos/adaptadores en los 10 dominios restantes (`flota`, `cliente`, `catalogos`, `tecnicos`, `usuarios`, `configuracion`, `notificaciones`, `reportes`, `operador`, `rutas`) | ✅ Hecho — los 12 dominios de `src/features/**` quedan con el mismo patrón |
| Fase 2: utilidad de normalización de errores (`src/lib/errores.ts`) | ✅ Hecho, aplicada en 3 componentes representativos (1 por tipo de fuente de error); el resto queda documentado como trabajo futuro |
| Fase 2: desacoplar el envío de notificaciones del camino crítico | ✅ Hecho — corregido además un problema de diseño detectado en verificación (ver sección 4) |
| Fase 2: `correlacion_id` en respuestas de Edge Functions | ✅ Hecho (alcance acotado, ver sección 6) |
| Fase 2: matriz de decisión (consulta directa / RPC / Edge Function) | ✅ Documentada en `CLAUDE.md` |
| Fase 2: outbox con reintentos (`pg_cron`) | ✅ Migración y Edge Function escritas con política por defecto (cada 5 min, 3 intentos, backoff simple) — **no desplegado**, requiere un paso manual de configuración (ver sección 7) |
| Fase 2: idempotencia de mutaciones | ✅ Backend completo en 3 funciones críticas; frontend cableado solo en `registrar_avance_operador` (ver sección 8) |

Ejecutado con 7 agentes en paralelo (4 para los dominios restantes, agrupados por tamaño; 2 para
los ítems de Fase 2; 1 adicional para dos dominios que faltaron en el primer lote), cero
solapamiento de archivos entre ellos, seguido de verificación integrada propia.

### Verificación final (repo completo, después de integrar los 7 agentes + la corrección manual)

| Verificación | Resultado |
|---|---|
| `npx tsc -b` | ✅ Sin errores |
| `npm run lint` | ✅ 0 errores (1 warning preexistente sin relación) |
| `npm run format:check` | ✅ Limpio |
| `npm run build` | ✅ Exitoso |
| `npm run test` (Vitest) | ✅ 14/14 |
| `npm run test:e2e` (Playwright) | ✅ 2/2 |
| Grep de `supabase.(from\|rpc\|functions.invoke\|storage\|auth)` en `src/features/*/hooks/*.ts` | ✅ Cero coincidencias en los 12 dominios |

---

## 2. Puertos/adaptadores — cobertura completa

Se aplicó el mismo patrón ya establecido en `solicitudes`/`auth` (Fase 1) a los 10 dominios
restantes. Tamaño real (mucho menor que `solicitudes`, lo que permitió agentes pequeños y
paralelos sin riesgo):

| Dominio | Archivos de hooks originales | Notas |
|---|---:|---|
| `flota` | 2 (302 líneas) | El más grande de este lote; 12 métodos de repositorio (rutas de proceso, vehículos, movimientos, fotos, gastos, indisponibilidad) |
| `cliente` | 3 (203 líneas) | — |
| `catalogos` | 1 (45 líneas) | Repositorio genérico (`listar<T>(tabla)`), porque el hook original ya era genérico por tabla |
| `tecnicos` | 1 (35 líneas) | — |
| `usuarios` | 1 (46 líneas) | El adaptador conserva el helper que invoca la Edge Function `admin-users` |
| `configuracion` | 1 (78 líneas) | — |
| `notificaciones` | 2 (135 líneas) | Se dividió en dos repositorios (feed interno vs. configuración de correo por solicitud) por ser conceptos distintos aunque compartan dominio |
| `reportes` | 1 (32 líneas) | — |
| `operador` | 1 (93 líneas) | No se tocaron `use-attachment-uploads.ts`/`use-avance-draft.ts`/`lib/adjuntos.ts` (de una fase anterior, sin relación) |
| `rutas` | 1 (45 líneas) | Modelo antiguo, mayormente código muerto (`route-control-form.tsx` no está montado en ninguna página) — pero `useSolicitudesParaRuta` sí lo consume `process-route-form.tsx` (código vivo), así que se migró completo por consistencia |

En todos los casos: mismas firmas públicas de hook, mismas query keys de TanStack Query, mismo
comportamiento observable (mensajes de error, validaciones) — verificado por cada agente y
reconfirmado en la verificación integrada final.

**Nota de proceso**: durante la ejecución en paralelo, dos agentes reportaron fallos transitorios de
`tsc -b`/`build` causados por ver el árbol de trabajo a mitad de la edición de otro agente
concurrente (archivos `ports/adapters/lib` de un dominio vecino a medio escribir) — ambos se
resolvieron solos al reintentar segundos después, y la verificación integrada final (ejecutada una
sola vez sobre el estado ya estable) confirma que no quedó ningún problema real de integración.

---

## 3. Fase 2 — normalización de errores

`src/lib/errores.ts` exporta `normalizarError(error: unknown): { mensaje; codigo? }`, que compone
sobre `traducirError`/`traducir` de `src/lib/i18n.ts` (ya existente, antes subutilizado) en vez de
duplicar su lógica. Distingue: `Error` estándar (cubre también los errores de Edge Functions, que
heredan de `Error`), objetos con forma de `PostgrestError` (`{message, code}`), y un fallback
genérico (nueva clave i18n `unexpectedError`, es/en).

Se aplicó deliberadamente solo en **3 componentes representativos** (uno por cada fuente de error:
Edge Function, RPC, query simple) — `operator-progress-form.tsx`, `operator-resolution-request.tsx`,
`request-timeline.tsx` — en vez de barrer los ~20 componentes restantes que hoy muestran
`{error.message}` crudo, para mantener el cambio acotado y revisable. Esa lista de ~19 archivos
pendientes queda como trabajo futuro (el detalle completo está en la transcripción del agente, no se
repite aquí para no duplicar mantenimiento).

---

## 4. Fase 2 — desacoplar notificaciones del camino crítico

### Lo que hizo el agente

`gestionar-solicitud`/`registrar-avance` invocaban `notificarEstado(...)` con `await` antes de
construir la respuesta HTTP — si el servidor SMTP estaba lento o caído, el usuario que asignaba una
solicitud (o cualquier acción que dispare notificación) esperaba esa latencia completa, aunque la
operación de negocio ya hubiera terminado. El agente envolvió esas llamadas en
`EdgeRuntime.waitUntil(...)`, verificando la API contra la documentación oficial de Supabase.

### Problema encontrado en la verificación, y corrección aplicada directamente (no delegada)

El agente, de forma honesta, señaló en su propio reporte un efecto secundario real: al diferir la
llamada **completa** a `notificarEstado` (no solo el envío SMTP), el `INSERT` síncrono del registro
`pendiente` en `notificaciones_envios` también quedaba diferido — se abría una ventana de carrera
donde ese registro podía no existir todavía justo después de que el cliente recibiera la respuesta
HTTP exitosa.

Se corrigió dividiendo `notificarEstado` en dos fases explícitas en
`supabase/functions/_shared/notificaciones.ts`:

- **`iniciarNotificacion`** (síncrona, `await`ada antes de responder): verifica configuración,
  consulta la solicitud/cliente, e inserta el registro `pendiente` — es solo una escritura a base de
  datos, de latencia despreciable frente a un envío SMTP real. Ya no hay ventana de carrera: el
  registro existe siempre que el cliente recibe la respuesta.
- **`enviarNotificacionPendiente`** (asíncrona, despachada vía `EdgeRuntime.waitUntil` después de
  responder): el envío SMTP real y la actualización final a `enviado`/`error`.
- **`notificarEnSegundoPlano`**: combina ambas para los 2 callers, con su propio `try/catch` — un
  fallo al *iniciar* la notificación (por ejemplo si la solicitud no se pudo releer) no debe
  convertir la respuesta de una operación de negocio ya exitosa en un error 500.

Los 5 puntos de invocación (4 en `gestionar-solicitud/index.ts`, 1 en `registrar-avance/index.ts`)
se actualizaron a `await notificarEnSegundoPlano(...)`.

### Verificación de este cambio específico

Las Edge Functions no tienen suite de pruebas propia ni se pueden ejecutar localmente sin la CLI de
Supabase vinculada a un proyecto. Se verificó por revisión manual: `npx eslint` sobre los 3 archivos
tocados (limpio), `npx prettier --write` (sin cambios de contenido, solo formato), y relectura línea
por línea de los 5 call sites confirmando que ninguno depende del resultado de la notificación para
construir su respuesta HTTP de éxito.

### Riesgo residual documentado (no resuelto, requiere decisión operativa)

`EdgeRuntime.waitUntil` no garantiza que el trabajo en segundo plano termine si la instancia de la
función se apaga antes por límites de tiempo/CPU/memoria — el envío SMTP en sí (ya no el registro
`pendiente`, que ahora es síncrono) podría quedarse a medias en un caso extremo, sin reintento
automático. Esto es exactamente el problema que un patrón outbox con `pg_cron` (Fase 2, ítem
pendiente, ver `docs/informe-arquitectura-fase-1.md` sección 5) resolvería con reintentos — no se
implementó ahora porque requiere habilitar una extensión de Postgres y decidir una política de
reintento, una decisión operativa fuera del alcance de este cambio.

---

## 5. Fase 2 — correlación y matriz de decisión

Ejecutado directamente (sin delegar a un agente), dado que requería precisión sobre las
limitaciones reales de Postgres en un entorno con connection pooling.

### `correlacion_id` en respuestas de Edge Functions

Las tres funciones (`gestionar-solicitud`, `registrar-avance`, `admin-users`) ahora generan
`crypto.randomUUID()` al inicio de cada invocación y lo incluyen como `correlacion_id` en **toda**
respuesta (éxito o error), vía una función `respuesta()` redefinida como closure dentro del
handler (en vez de a nivel de módulo), para que cada request tenga su propio identificador sin
tocar ninguno de los ~30 sitios donde ya se llamaba `respuesta(...)`.

**Alcance deliberadamente acotado**: se evaluó threading el `correlacion_id` hacia
`automatizacion_ejecuciones.correlacion_id` (que ya existe en el esquema desde
`20260821160000_trazabilidad_automatizaciones.sql`) usando `set_config('app.correlacion_id', ...)`
a nivel de sesión de Postgres — pero Supabase usa pooling de conexiones en modo transacción
(PgBouncer), donde **no hay garantía de continuidad de sesión entre dos llamadas `.rpc()`
separadas** desde `supabase-js`; un `set_config(..., is_local=true)` hecho en una llamada no
necesariamente sobrevive hasta la siguiente. Hacerlo bien requeriría convertir las actualizaciones
directas de `gestionar-solicitud` (`.from('solicitudes').update(...)`) en funciones RPC, para que
el `set_config` y el `UPDATE` que dispara el trigger ocurran dentro de la misma función/transacción
— un refactor más grande, no ejecutado ahora. El `correlacion_id` actual es solo para
correlación cliente↔soporte vía la respuesta HTTP, no está enlazado (todavía) con la auditoría de
automatizaciones.

### Matriz de decisión

Se documentó en `CLAUDE.md` (sección "Decision matrix") el criterio ya implícito en el código para
elegir entre consulta directa, RPC y Edge Function, formalizando la recomendación de la propuesta
original (sección 7.2) contra las convenciones reales de este proyecto.

---

## 7. Fase 2 — outbox con reintentos para notificaciones

Política acordada con el usuario: pg_cron cada 5 minutos, 3 intentos con backoff simple (5/15/30
minutos), sin habilitar un vendor externo. Verificada la sintaxis exacta contra la documentación
oficial de Supabase (`supabase.com/docs/guides/functions/schedule-functions`) antes de escribir,
dado que no hay forma de probar esto en el entorno de esta sesión.

### Qué se escribió

**`supabase/migrations/20260822120000_outbox_notificaciones.sql`** (nueva):
- Habilita `pg_cron` y `pg_net`.
- Agrega `intentos` (arranca en 1) y `siguiente_intento_en` a `notificaciones_envios`, más un
  índice parcial sobre filas `pendiente`/`error`.
- `reclamar_notificaciones_pendientes(p_limite)`: reclama hasta *p_limite* filas vencidas de
  backoff con `for update skip locked` (dos ejecuciones de cron superpuestas nunca procesan la
  misma fila dos veces), incrementa `intentos` y calcula el próximo backoff, y devuelve los datos
  necesarios para reenviar — otorgada únicamente a `service_role`.
- `cron.schedule('procesar-notificaciones-pendientes', '*/5 * * * *', ...)`: invoca la nueva Edge
  Function vía `net.http_post`, leyendo URL y `apikey` desde `vault.decrypted_secrets` (nunca
  hardcodeados en la migración — los valores dependen del entorno).

**`supabase/functions/procesar-notificaciones-pendientes/index.ts`** (nueva): sin usuario detrás
— corre con `service_role`, llama `reclamar_notificaciones_pendientes`, y por cada fila reclamada
reutiliza `enviarNotificacionPendiente` (la misma función que ya usa el camino normal), sin
duplicar la lógica de envío SMTP.

### Paso manual pendiente, deliberadamente no incluido en la migración

El job queda programado pero sin efecto (el `net.http_post` fallará silenciosamente al no
encontrar los secretos) hasta ejecutar, **una sola vez, contra el proyecto real**:

```sql
select vault.create_secret('https://<project-ref>.supabase.co', 'notif_functions_base_url');
select vault.create_secret('<anon/publishable key>', 'notif_publishable_key');
```

No se incluyó en la migración porque el valor depende del entorno (desarrollo/pruebas/producción
tendrían URLs distintas) — una migración compartida no debe fijar un valor de un solo entorno.
Después de aplicar la migración (`supabase db push`, no ejecutado en esta sesión) y desplegar la
función (`supabase functions deploy procesar-notificaciones-pendientes`), correr esos dos
`vault.create_secret` deja el outbox completamente operativo.

### Verificación

Sin acceso a un proyecto Supabase vinculado en este entorno para `db push`, la verificación fue:
lectura cuidadosa del esquema real de `notificaciones_envios` (no se asumió ningún nombre/tipo de
columna) antes de escribir la migración, `npx eslint`/`npx prettier` limpios sobre la nueva Edge
Function, y contraste de la sintaxis de `cron.schedule`/`vault.decrypted_secrets`/`net.http_post`
contra la documentación oficial vigente. **No probado end-to-end contra una base de datos real** —
se recomienda verificar en un entorno de pruebas antes de aplicar en producción.

---

## 8. Fase 2 — idempotencia de mutaciones críticas

### Diseño

`idempotencia_claves` (nueva tabla): `clave uuid primary key`, `usuario_id`, `operacion`,
`resultado jsonb`, `creado_en`. Sin políticas de RLS para `authenticated` — solo la leen/escriben
las propias funciones `security definer`. Un cliente que reintenta la misma llamada con la misma
clave recibe el resultado ya guardado en vez de duplicar la fila creada la primera vez.

**Se agregó a las 3 funciones que crean filas** (no a actualizaciones de estado, que ya son
naturalmente idempotentes — marcar `estado='asignada'` dos veces no duplica nada):
`crear_solicitud_portal`, `crear_solicitud_gestor`, `registrar_avance_operador`. En los tres casos
el parámetro nuevo es `p_idempotencia_clave uuid default null`, **al final** de la lista y con
default `null` — todo el código que no lo envía sigue funcionando exactamente igual que antes.

**Decisión técnica importante**: no se usó `create or replace function` con la lista de parámetros
modificada. En Postgres, la identidad de una función es su (nombre, tipos de parámetros) — agregar
un parámetro nuevo, aunque tenga default, hace que `create or replace` cree una **sobrecarga
nueva**, dejando la función vieja intacta y activa en paralelo. Con PostgREST resolviendo qué
sobrecarga usar por los nombres de argumentos en el JSON del body, tener dos versiones del mismo
nombre es un riesgo real de ambigüedad no verificable sin una base de datos real. Se usó en cambio
`drop function if exists (firma vieja); create function (firma nueva)`, que dejar una única función
sin ambigüedad — verificado contra semántica documentada de Postgres, no contra una base de datos
real (misma limitación que el resto de este ítem).

**Límite de concurrencia aceptado, no resuelto**: el patrón "verificar la clave, luego insertar" no
es perfectamente atómico ante dos solicitudes *verdaderamente concurrentes* con la misma clave
(ventana de milisegundos). Se acepta como límite conocido — documentado en el propio comentario de
la migración — porque el caso real que esto protege es un reintento *secuencial* del mismo cliente
tras un timeout o error de red (el escenario de campo con señal débil que motivó este ítem), no una
carrera de solicitudes simultáneas.

### Frontend: cableado completo solo para `registrar_avance_operador`

Es el de mayor valor práctico: ya existe infraestructura de borrador local del formulario de avance
(`src/features/operador/hooks/use-avance-draft.ts`, de una fase anterior de esta misma sesión) que
sobrevive a pérdida de señal o cierre accidental de pestaña — el lugar natural para persistir
también la clave de idempotencia. `obtenerClaveIdempotencia(solicitudId)` (nueva función en ese
mismo archivo) genera una clave una sola vez y la reutiliza en cada llamada mientras exista el
borrador; se descarta junto con él (éxito o "Descartar borrador" explícito). `RegistrarAvanceInput`
gana el campo `idempotencia_clave: string`; `operator-progress-form.tsx` la obtiene al enviar; la
Edge Function `registrar-avance` la reenvía como `p_idempotencia_clave`.

**No cableado (backend listo, frontend pendiente)**: `crear_solicitud_portal`/`crear_solicitud_gestor`
— `solicitud-form.tsx`/`use-crear-solicitud.ts` no tienen hoy una infraestructura de sesión estable
equivalente al borrador del operador; generar y mantener una clave estable ahí (p. ej. vía
`useRef`/`useState` en el componente, con el ciclo de vida correcto: misma clave en reintentos del
mismo intento de envío, nueva clave si el usuario cierra y reabre el formulario) es un cambio de
UI/estado que se dejó fuera de esta ronda para no improvisar un patrón nuevo bajo presión de tiempo.
La capacidad del backend ya está lista para usarse en cuanto se decida hacerlo.

### Verificación

Se leyeron las 3 definiciones completas de las funciones originales antes de modificarlas (no se
asumió ningún cuerpo). `tsc -b`, `npm run lint`, `npm run format:check`, `npm run build`,
`npm run test` (14/14) y `npm run test:e2e` (2/2) limpios sobre el cambio de frontend. La migración
SQL en sí **no se probó contra una base de datos real** (misma limitación que el resto de los
cambios de esquema de esta sesión) — se recomienda aplicarla primero en un entorno de pruebas.

---

## 9. Archivos nuevos/modificados (resumen)

**12 dominios** (`ports/`, `adapters/`, `lib/repository.ts` nuevos por dominio; hooks existentes
refactorizados internamente sin cambiar firmas): ver tabla de la sección 2 para el detalle por
dominio.

**Errores**: nuevo `src/lib/errores.ts` (+ `src/lib/errores.test.ts`), nueva clave i18n
`unexpectedError`; modificados `operator-progress-form.tsx`, `operator-resolution-request.tsx`,
`request-timeline.tsx`.

**Notificaciones y correlación**: modificados `supabase/functions/_shared/notificaciones.ts`,
`supabase/functions/gestionar-solicitud/index.ts`, `supabase/functions/registrar-avance/index.ts`,
`supabase/functions/admin-users/index.ts`.

**Outbox**: nuevos `supabase/migrations/20260822120000_outbox_notificaciones.sql`,
`supabase/functions/procesar-notificaciones-pendientes/index.ts`.

**Idempotencia**: nuevo `supabase/migrations/20260822130000_idempotencia_mutaciones_criticas.sql`;
modificados `src/features/operador/hooks/use-avance-draft.ts`,
`src/features/operador/types/operador.types.ts`,
`src/components/organisms/operator-progress-form.tsx`,
`supabase/functions/registrar-avance/index.ts`.

**Documentación**: este informe; actualizado `CLAUDE.md` (nota de dominios sin puertos/adaptadores
ya no era cierta; se agregó la matriz de decisión y la nota de correlación).
