# Validación técnica post-arquitectura

**Fecha:** 22 de agosto de 2026
**Alcance:** verificación técnica detallada de todo el sistema tras el cierre de la iniciativa de
arquitectura escalable (`docs/informe-arquitectura-general.md`, Fases 0-5), a pedido explícito del
usuario: confirmar que no quedó funcionalidad rota ni problemas técnicos.

---

## Metodología

1. Verificación mecánica completa (`tsc -b`, `lint`, `format:check`, `build`, `test`, `test:e2e`).
2. Smoke test manual de las 9 rutas de la SPA contra el build de producción real
   (`npm run build && npm run preview`), confirmando HTTP 200 en cada una (incluida una ruta
   inexistente, para confirmar el fallback `*` → `/`).
3. Dos auditorías independientes de solo lectura, en paralelo, cubriendo áreas que la verificación
   mecánica no alcanza:
   - **Frontend**: consistencia de navegación (todo enlace de menú apunta a una ruta real y
     viceversa), componentes huérfanos no documentados como código muerto intencional, que los 12
     dominios de `src/features/**` realmente no llamen a `supabase-js` desde sus hooks (la
     afirmación de `CLAUDE.md`), que cada `React.lazy()` de `router.tsx` apunte a un export
     nombrado real (un desajuste ahí rompería en runtime sin error de build/tipos), y restos de
     `console.log`/`debugger`/`FIXME`.
   - **Supabase**: que las firmas `DROP FUNCTION` de la migración de idempotencia coincidan
     exactamente con la definición original de cada función (para no dejar una sobrecarga
     ambigua), que las columnas que lee `procesar-notificaciones-pendientes` coincidan con las que
     devuelve `reclamar_notificaciones_pendientes`, que cada `.rpc()`/`.from()` de los 3 Edge
     Functions críticos referencie algo que realmente existe en las migraciones, e higiene general
     de migraciones (secuencia sin huecos, objetos duplicados, guardas `if not exists`/`if exists`
     consistentes).
4. Spot-check manual propio de la lógica de idempotencia del lado del cliente
   (`solicitud-form.tsx`, `operator-progress-form.tsx`, `use-avance-draft.ts`): confirmar que la
   clave solo rota después de un envío exitoso, no antes.

No hay Deno instalado en este entorno, así que `supabase/functions/**` se verificó por lectura
manual completa (no hay type-checker real disponible); tampoco hay Postgres/Supabase CLI local, así
que `supabase/migrations/**` se verificó leyendo cada archivo relevante línea por línea contra su
propia definición original, no ejecutándolo. Ninguna migración se desplegó ni se corrió contra un
proyecto real — por instrucción explícita del usuario, ese paso sigue siendo manual.

---

## Resultado: 1 bug funcional real, 4 inconsistencias menores — los 5 corregidos

### 🔴 Bug funcional: el worker de outbox nunca habría podido autenticarse

`supabase/migrations/20260822120000_outbox_notificaciones.sql` — el `net.http_post` que dispara
`pg_cron` cada 5 minutos hacia `procesar-notificaciones-pendientes` solo enviaba el header `apikey`.
Ningún Edge Function de este proyecto tiene una excepción `verify_jwt = false` para esta función en
`supabase/config.toml` (las 3 únicas excepciones documentadas ahí son `admin-users`,
`gestionar-solicitud`, `registrar-avance` — las 3 con `verify_jwt = true` explícito, y
`procesar-notificaciones-pendientes` ni siquiera aparece, así que hereda el default `true` de la
CLI). El gateway de Edge Functions de Supabase exige `Authorization: Bearer <jwt>` para esa
verificación, no `apikey` solo — como estaba escrito, **cada intento de reintento automático habría
sido rechazado con 401 antes de ejecutar una sola línea del código de la función**, dejando el outbox
completo (la pieza que existe específicamente para recuperar notificaciones fallidas) sin efecto real
desde el primer día, silenciosamente.

**Corregido**: se agregó `'Authorization', 'Bearer ' || (...)` al `jsonb_build_object` de headers,
reutilizando la misma clave anon/publishable ya usada como `apikey` — es un JWT válido firmado por el
proyecto, exactamente el patrón estándar para llamadas servidor-a-función sin usuario detrás.

**Por qué no se detectó antes**: la migración nunca se desplegó (`supabase db push` está fuera del
alcance de este agente por instrucción del usuario), así que nunca se ejecutó de verdad contra un
proyecto real donde el 401 se hubiera manifestado. Es exactamente el tipo de defecto que un
`tsc`/`lint`/`build` no puede atrapar — vive enteramente en SQL sin tipos, invocando un servicio
externo.

### 🟡 Inconsistencia de arquitectura: subida de adjuntos fuera del patrón puertos/adaptadores

`src/features/operador/hooks/use-attachment-uploads.ts` importaba `supabase` directamente y llamaba
`supabase.storage.from(...).upload/remove(...)` desde el hook — el único punto de todo
`src/features/**` que no seguía el patrón puertos/adaptadores que `CLAUDE.md` documenta como
completo en los 12 dominios. No es un bug de runtime (funcionaba), pero sí una afirmación de
documentación falsa y una inconsistencia real: este hook no era sustituible por un doble de prueba
como el resto.

**Corregido**: se agregaron `subirAdjunto`/`eliminarAdjuntos` a `OperadorRepository`
(`ports/operador-repository.ts`) y su implementación en `SupabaseOperadorRepository`
(`adapters/supabase-operador-repository.ts`, con el nombre del bucket movido ahí como detalle de
implementación); el hook ahora llama al repositorio. Comportamiento observable preservado
exactamente: un `Supabase no configurado` sigue resultando en el mismo mensaje de error por ítem
(antes por un chequeo temprano, ahora porque el repositorio lanza y el `catch` ya existente lo
captura), y el rollback de `cancelar()` sigue siendo silencioso ante fallos (antes porque nunca
comprobaba el error de `.remove()`, ahora envuelto en un `try/catch` explícito con esa razón
documentada).

### 🟡 Código muerto no documentado

`src/components/organisms/setup-overview.tsx` (`SetupOverview`) y su único consumidor,
`src/components/molecules/status-card.tsx` (`StatusCard`) — cero referencias en todo el repo,
contenido de scaffolding inicial ya obsoleto ("políticas RLS en la siguiente fase", cuando RLS lleva
implementado desde hace mucho). A diferencia de `route-control-form.tsx`/`solicitudes-admin-page.tsx`
(código muerto ya documentado como intencional en `docs/arquitectura-actual.md`), este no estaba
señalado en ningún lado.

**Corregido**: ambos archivos eliminados — confirmado por grep que no queda ninguna referencia.

### 🟡 Desajuste de tipo latente en el outbox

`reclamar_notificaciones_pendientes` declaraba su columna de retorno `numero` como `integer`, pero
`solicitudes.numero` es `bigint`. Funciona hoy vía cast implícito; sería un bug real solo si el
contador de solicitudes superara ~2.1 mil millones — no es un problema actual, pero corregirlo no
cuesta nada y elimina el riesgo por completo.

**Corregido**: cambiado a `bigint` en la misma migración del outbox.

### 🟡 Guardas `drop policy` inconsistentes

`20260822100000_notificaciones_internas_y_documentos_cliente.sql` redefinía 2 políticas RLS con
`drop policy nombre on tabla;` (sin `if exists`), a diferencia del patrón ya establecido en otras
migraciones del mismo repo (`drop policy if exists ...`). Bajo una aplicación secuencial completa
normal no falla, pero rompe la garantía de "migraciones idempotentes al reejecutar" que `CLAUDE.md`
documenta como convención del proyecto.

**Corregido**: se agregó `if exists` a ambas.

---

## Hallazgos revisados y descartados (no son bugs)

- **Comentario impreciso sobre qué trigger lee `correlacion_id_operacion`**: el comentario original
  de `20260822140000_correlacion_automatizaciones.sql` decía que "ambos" triggers (`validar_cambio_solicitud`
  BEFORE y `trazar_automatizaciones_solicitud` AFTER) "ven" el valor — técnicamente cierto (ambos
  disparan sobre la misma sentencia y ambos tienen la fila `NEW` disponible) pero podía leerse como
  que ambos lo *usan*, cuando solo `trazar_automatizaciones_solicitud` lo lee. No es un bug de
  comportamiento — se aclaró el comentario para que sea inequívoco.
- **`correlacion_id_operacion` nunca se limpia entre updates**: revisado el guard existente
  (`new.correlacion_id_operacion is distinct from old.correlacion_id_operacion and ... is not null`)
  — ya previene por completo el escenario de reutilización indebida que esto podría sugerir; un
  `UPDATE` que no fije la columna explícitamente deja `new = old`, y el guard cae a `null`. No
  requiere cambio de código.
- **Idempotencia de `crear_solicitud_portal`/`crear_solicitud_gestor`/`registrar_avance_operador`**:
  las 3 firmas `DROP FUNCTION IF EXISTS` coinciden exactamente con la definición original de cada
  función — verificado contra su migración de origen. Sin riesgo de sobrecarga ambigua.
- **Router, lazy-loading, RPC/tablas referenciadas por los 3 Edge Functions críticos, ausencia de
  `console.log`/`debugger`**: verificados, sin hallazgos.

---

## Verificación final (repo completo, tras aplicar las 5 correcciones)

| Verificación | Resultado |
|---|---|
| `npx tsc -b --force` | ✅ Sin errores |
| `npm run lint` | ✅ 0 errores (1 warning preexistente sin relación, en `button.tsx`) |
| `npm run format:check` | ✅ Limpio |
| `npm run build` | ✅ Exitoso |
| `npm run test` (Vitest) | ✅ 14/14 |
| `npm run test:e2e` (Playwright, contra build de producción) | ✅ 2/2 |
| Smoke test manual de rutas (`curl` sobre las 9 rutas de la SPA contra `preview`) | ✅ Las 9 responden HTTP 200 |
| `supabase/functions/**` y `supabase/migrations/**` modificados | ✅ Revisados manualmente línea por línea (sin Deno/Postgres local disponible en este entorno) |

**Limitación honesta que persiste**: el bug del outbox (el hallazgo más serio de esta validación)
solo se detectó porque un agente revisó el mecanismo de autenticación de `net.http_post` contra la
configuración real de `supabase/config.toml` — no porque se haya ejecutado. Ninguna migración ni
función se desplegó como parte de esta validación; el usuario debe correr `supabase db push` para
que esta corrección (y el resto de la migración del outbox) tenga efecto real. Se recomienda, tras
desplegar, confirmar en Supabase → Edge Functions → Logs que `procesar-notificaciones-pendientes` deja
de recibir 401 y empieza a aparecer el log `logInfo` de "Lote de notificaciones pendientes
procesado" (agregado en la Fase 4) cada 5 minutos.
