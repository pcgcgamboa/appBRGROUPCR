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

## 5. Archivos nuevos/modificados (resumen)

**12 dominios** (`ports/`, `adapters/`, `lib/repository.ts` nuevos por dominio; hooks existentes
refactorizados internamente sin cambiar firmas): ver tabla de la sección 2 para el detalle por
dominio.

**Errores**: nuevo `src/lib/errores.ts` (+ `src/lib/errores.test.ts`), nueva clave i18n
`unexpectedError`; modificados `operator-progress-form.tsx`, `operator-resolution-request.tsx`,
`request-timeline.tsx`.

**Notificaciones**: modificados `supabase/functions/_shared/notificaciones.ts`,
`supabase/functions/gestionar-solicitud/index.ts`, `supabase/functions/registrar-avance/index.ts`.

**Documentación**: este informe; actualizado `CLAUDE.md` (la nota de "solo `solicitudes`/`auth`
tienen puertos/adaptadores" ya no era cierta).
