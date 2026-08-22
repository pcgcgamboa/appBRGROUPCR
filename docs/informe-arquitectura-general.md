# Informe general — arquitectura escalable (Fases 0-5)

**Fecha:** 22 de agosto de 2026
**Origen:** ejecución multi-agente de `Propuesta_Arquitectura_Escalable_React_Supabase.md` (propuesta
adjuntada por el usuario) sobre el Sistema de Solicitudes de Servicio, en una sesión única orquestada
con Claude Code.

Este documento es el punto de entrada a la iniciativa completa: resume qué cambió, muestra la
arquitectura resultante, y remite a los 5 informes detallados (uno por fase) para el detalle
línea-por-línea de cada cambio y su verificación.

---

## 1. Resumen ejecutivo

| Fase | Nombre (propuesta original) | Estado | Informe detallado |
|---|---|---|---|
| 0 | Medición y decisiones | ✅ Completa | `informe-arquitectura-fase-1.md` §6.1 |
| 1 | Fronteras y calidad | ✅ Completa | `informe-arquitectura-fase-1.md`, `-fase-2.md` §1-2 |
| 2 | Integración segura | ✅ Completa | `informe-arquitectura-fase-2.md` |
| 3 | Rendimiento y datos | ✅ Completa (2 de 5 sub-ítems ejecutables; 3 diferidos con evidencia) | `informe-arquitectura-fase-3.md` |
| 4 | Observabilidad y continuidad | ✅ Completa (logs + runbook; métricas/APM diferidos) | `informe-arquitectura-fase-4.md` |
| 5 | Escalamiento basado en evidencia | ⏸️ Documentada, sin cambios de código — explícitamente condicionada a evidencia de producción inexistente hoy | `informe-arquitectura-fase-5.md` |

**Lo que cambió, en una frase por fase**: pruebas automatizadas + patrón puertos/adaptadores en los
12 dominios de `src/features/**` + router real por URL (Fase 0-1) → normalización de errores +
notificaciones desacopladas del camino crítico + `correlacion_id` de extremo a extremo + outbox con
reintentos + idempotencia en las 3 mutaciones críticas (Fase 2) → code-splitting por ruta + caché
selectiva para catálogos (Fase 3) → logs estructurados en todos los Edge Functions + runbook de
restauración (Fase 4) → criterios de activación documentados para réplicas/particiones/almacén
analítico/extracción de servicios, sin implementarlos todavía (Fase 5).

**Lo que deliberadamente no se hizo, y por qué** (no son omisiones, son decisiones documentadas):

- Paginación por cursor en `listarAdmin()`, revisión de índices con planes reales, política de
  retención — Fase 3, requieren datos/tráfico de producción que no existen en este entorno.
- Un proveedor de observabilidad para métricas/alertas/APM — Fase 4, decisión de presupuesto y
  negocio.
- Réplicas, particionamiento, almacén analítico, extracción de servicios — Fase 5, la propia
  propuesta original los condiciona a evidencia que hoy no existe; implementarlos ahora sería
  sobre-ingeniería.
- Ejecutar el simulacro de restauración de respaldo — Fase 4, requiere crear un proyecto Supabase de
  prueba y presencia humana en la consola; solo se documentó el procedimiento
  (`runbook-restauracion-respaldo.md`).

### Verificación acumulada

Cada fase se verificó de forma independiente e íntegra (no solo por el reporte de cada agente) antes
de comitear: `npx tsc -b`, `npm run lint`, `npm run format:check`, `npm run build`, `npm run test`
(Vitest), `npm run test:e2e` (Playwright contra el build de producción). El detalle de cada corrida
está en la sección "Verificación" de cada informe de fase; todas terminaron limpias. Ningún cambio se
desplegó (`supabase db push` / `supabase functions deploy`) — eso permanece como paso manual del
usuario, por instrucción explícita.

---

## 2. Arquitectura resultante

```mermaid
flowchart TB
  U[Usuario] --> R["React Router (rutas reales por rol, lazy-loaded)"]
  R --> Guard["RequireSession / RequireRole"]
  Guard --> Shell[AppShell]
  Shell --> Pages["Páginas por rol y sección<br/>(Suspense en 2 niveles: raíz + anidado en admin/encargado/cliente)"]
  Pages --> Hooks["Hooks de dominio (TanStack Query,<br/>staleTime selectivo en catálogos)"]

  subgraph "12 dominios de src/features/** — mismo patrón en todos"
    Hooks --> Port["Puerto: *Repository (interfaz)"]
    Port --> Adapter["Adaptador Supabase (supabase-js)"]
  end

  Adapter --> DB[(PostgreSQL + RLS)]
  Adapter --> EF["Edge Functions<br/>(gestionar-solicitud, registrar-avance, admin-users,<br/>procesar-notificaciones-pendientes)"]
  EF --> DB
  EF --> Log["Logs estructurados JSON<br/>(correlacion_id + funcion)"]
  DB --> RPC["Funciones transaccionales<br/>(idempotencia en las 3 mutaciones críticas)"]
  DB --> AUD["Triggers de auditoría<br/>(automatizacion_ejecuciones, correlacion_id_operacion)"]
  EF -.EdgeRuntime.waitUntil.-> SMTP["Envío SMTP en segundo plano"]
  CRON["pg_cron (cada 5 min)"] --> Outbox["procesar-notificaciones-pendientes<br/>(reintentos con backoff)"]
  Outbox --> SMTP
```

Cambios centrales frente al estado previo a esta iniciativa:

1. **Navegación por URL real**, no por `useState` — cada vista de cada rol es enlazable, y desde la
   Fase 3 además carga en su propio chunk (`React.lazy`), bajando el bundle principal de 673 kB a
   260,58 kB.
2. **Cero llamadas a `supabase-js` directamente desde hooks** — los 12 dominios pasan por un
   puerto/adaptador, lo que los hace sustituibles en pruebas unitarias sin tocar componentes.
3. **El camino crítico de una mutación de negocio nunca espera una notificación por correo** — el
   registro de auditoría se escribe síncronamente, el envío SMTP se despacha después de responder.
4. **Toda invocación de Edge Function es correlacionable de extremo a extremo**: un mismo
   `correlacion_id` viaja en la respuesta HTTP al cliente, en `automatizacion_ejecuciones` (para las
   4 acciones de `gestionar-solicitud`), y ahora también en los logs estructurados de cualquier fallo
   — incluido el de un envío SMTP fallido en segundo plano o de una corrida del worker de outbox.
5. **Un reintento del cliente tras un timeout no duplica datos** — las 3 mutaciones que crean filas
   nuevas (`crear_solicitud_portal`, `crear_solicitud_gestor`, `registrar_avance_operador`) aceptan
   una clave de idempotencia opcional.

---

## 3. Índice de informes detallados

- `docs/informe-arquitectura-fase-1.md` — Fase 0 (checkpoint, medición) y Fase 1 (pruebas
  automatizadas, puertos/adaptadores en `solicitudes`/`auth`, React Router).
- `docs/informe-arquitectura-fase-2.md` — resto de dominios con puertos/adaptadores, normalización de
  errores, notificaciones desacopladas, `correlacion_id`, matriz de decisión, outbox, idempotencia.
- `docs/informe-arquitectura-fase-3.md` — code-splitting por ruta, caché selectiva, paginación/índices
  diferidos con razonamiento.
- `docs/informe-arquitectura-fase-4.md` — logs estructurados, runbook de restauración, métricas/APM
  diferidos con razonamiento.
- `docs/informe-arquitectura-fase-5.md` — criterios de activación para réplicas, particionamiento,
  almacén analítico y extracción de servicios; cierre de la hoja de ruta.

`CLAUDE.md` refleja el estado final de cada uno de estos cambios como guía viva para trabajo futuro —
es la referencia a mantener actualizada, no estos informes (que son un registro histórico del proceso).
