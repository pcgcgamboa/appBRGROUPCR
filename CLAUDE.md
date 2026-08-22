# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Sistema de Solicitudes de Servicio: a responsive web app for managing field service requests (mantenimiento, soporte, reparación, instalación) through their full lifecycle — creation, assignment, route/fleet dispatch, on-site progress with materials and attachments, and client-validated closure. Roles: `administrador`, `encargado`, `operador`, `cliente`, `solicitante`; a user can hold multiple roles and switch the active one at runtime (`SessionToolbar`).

The functional spec lives in `docs/requerimientos-sistema-solicitudes-servicio.md` — read it before making product/behavior decisions. `docs/fase-2-*.md` … `docs/fase-7-*.md` are historical per-phase notes and are **not all current**: in particular `docs/fase-4-control-ruta.md` describes the original one-route-per-request model, which was superseded by the grouped "rutas de proceso" model (see Domain notes below) — its UI (`route-control-form.tsx`) is dead code, not referenced by any page. `docs/propuesta-mejoras-srm-ticketing-crm-tms.md` is a forward-looking roadmap proposal, not implemented state.

## Commands

```
npm run dev            # Vite dev server
npm run build           # tsc -b && vite build (type-checks, then bundles)
npm run lint             # eslint .
npm run format           # prettier --write .
npm run format:check     # prettier --check .
npm run preview          # serve the production build locally
```

```
npm run test            # vitest run — unit/component tests (jsdom + Testing Library)
npm run test:watch      # vitest, watch mode
npm run test:e2e        # playwright test — E2E against `npm run build && npm run preview`
```

CI (`.github/workflows/ci.yml`) runs `npm run lint`, `npm run format:check`, `npm run test`, `npm run build`, then `npm run test:e2e` (after installing Playwright's browser) on push/PR to `main`. Test coverage is intentionally small (a few representative unit/component specs plus one credential-free E2E smoke spec covering public routes) rather than exhaustive — extending it is future work, not a completed suite.

Supabase-side changes require a linked project and the Supabase CLI:

```
supabase db push                              # apply pending migrations
supabase functions deploy <name>              # deploy an Edge Function
supabase secrets set --env-file supabase/.env.local   # SMTP secrets, etc.
```

`docs/configuracion-supabase.md` covers linking a remote project and bootstrapping the first `administrador` (must be done via direct SQL against `usuario_roles` — no user can self-assign a role, and there's no in-app path for the very first admin).

## Architecture

**Stack**: React 18 + TypeScript + Vite, Tailwind CSS with local shadcn/ui-style primitives (not an external component package — extend `src/components/atoms` directly), TanStack Query for server state, Zustand for UI state, React Hook Form + Zod (used in some feature forms, not all — several organisms still validate with plain `useState` + native HTML attributes), Leaflet/React Leaflet for maps, Recharts for charts. Backend is Supabase end-to-end: Postgres + Auth + Storage + Edge Functions, authorization via RLS.

**Routing**: `react-router-dom` (`BrowserRouter`), wired in `src/app/router.tsx`. `AppShell` is the single root layout route (`<Outlet/>`). `/` (`InicioPage`) redirects to the user's default role branch (`/administrador`, `/encargado`, `/solicitante`, `/operador`, `/cliente`), picking the first role the profile returns that's in `src/app/roles-navegacion.ts`'s navigable list — `RequireSession`/`RequireRole` (`src/app/route-guards.tsx`) guard each branch. Admin/encargado/cliente expose their sections as nested routes (e.g. `/administrador/solicitudes`) rather than internal `useState`. `/login` and `/bolsa-empleo` are explicit public routes. See `docs/informe-arquitectura-fase-1.md` for the full migration rationale.

**Route-level code-splitting**: every page component in `src/app/router.tsx` is `React.lazy(() => import(...).then((m) => ({ default: m.ExportName })))` — plain imports were the single largest driver of an oversized main bundle before this. Every top-level `<Route>` wraps its `element` in `<Suspense fallback={<CargandoRuta />}>`; the three shells with their own sub-navigation (`admin-dashboard-page.tsx`, `encargado-dashboard-page.tsx`, `cliente-page.tsx`) additionally wrap their internal `<Outlet/>` in a **second, nested** `Suspense` — without it, switching sub-sections within a role would flicker the whole shell/sidebar instead of just the content area. When adding a new page, follow this pattern rather than a static import. See `docs/informe-arquitectura-fase-3.md`.

**Data-access layering**: every domain under `src/features/**` (`solicitudes`, `auth`, `flota`, `cliente`, `catalogos`, `tecnicos`, `usuarios`, `configuracion`, `notificaciones`, `reportes`, `operador`, `rutas`) has a ports/adapters (repository) layer at `{ports,adapters,lib}/` — hooks call a typed repository interface instead of `supabase-js` directly, which is what makes them swappable in unit tests. When adding a new hook to an existing domain, add the method to that domain's port/adapter rather than calling `supabase` from the hook. See `docs/informe-arquitectura-fase-1.md` and `docs/informe-arquitectura-fase-2.md` for the migration rationale.

**Error normalization**: `src/lib/errores.ts` (`normalizarError`) composes on top of `traducirError`/`traducir` in `src/lib/i18n.ts` to turn a thrown `unknown` (Postgres/PostgREST error, Edge Function error, or generic `Error`) into a consistent `{ mensaje, codigo? }`. Applied so far only in a few representative components (`operator-progress-form.tsx`, `operator-resolution-request.tsx`, `request-timeline.tsx`); most of the ~20 other components still render `{error.message}` directly — migrating them is future work, not a completed sweep.

**Notification delivery**: `gestionar-solicitud`/`registrar-avance` no longer `await` the SMTP send before responding. `supabase/functions/_shared/notificaciones.ts` splits `iniciarNotificacion` (sync — writes the `pendiente` row in `notificaciones_envios`, awaited before the HTTP response) from `enviarNotificacionPendiente` (the actual SMTP send, dispatched via `EdgeRuntime.waitUntil(...)` after the response). `notificarEnSegundoPlano` combines both for callers and swallows its own errors so a notification failure never turns a successful business operation into a 500.

**Request correlation**: each Edge Function (`gestionar-solicitud`, `registrar-avance`, `admin-users`) generates a `crypto.randomUUID()` at the top of its `Deno.serve` handler and folds it into every response body as `correlacion_id` (success or error), via a `respuesta()` closure defined per-request rather than at module scope. This is client/support-facing correlation only — it is **not** currently threaded into `automatizacion_ejecuciones.correlacion_id` (each trigger-generated row still gets its own independent random id): doing that properly would require converting `gestionar-solicitud`'s direct `.from('solicitudes').update(...)` calls into RPC functions first (so a `set_config('app.correlacion_id', ...)` call inside the same function/transaction could be read by the trigger), which is a larger, separate refactor.

**Decision matrix — direct query vs. RPC vs. Edge Function** (extend this when adding a new mutation, don't invent a new mechanism ad hoc): a simple read authorized entirely by RLS → call the repository's adapter with `.from(table).select(...)` directly (see any `adapters/supabase-*-repository.ts`); a write that's a single-row, low-risk CRUD op fully covered by RLS → same, direct `.from(table).insert/update/delete(...)` in the adapter; a write with business rules, multiple related writes that must be atomic, or state-transition validation → a Postgres `security definer` function (`supabase/migrations`), invoked via `.rpc(...)` from the adapter; an operation needing `service_role` privileges, or that must run notification/audit side effects after the fact → an Edge Function in `supabase/functions` that validates the caller's role, does the RPC/update with the caller's own JWT (except `admin-users`, which is the sole `service_role` exception), and dispatches non-critical side effects (email) via `EdgeRuntime.waitUntil(...)` rather than blocking the response.

**Observability**: `supabase/functions/_shared/logger.ts` (`logError`/`logInfo`) prints structured JSON lines to `console.error`/`console.log` — no external vendor, since Supabase's own Edge Functions Logs explorer already captures stdout/stderr for free and is searchable by the fields you print. Every `catch` block in `gestionar-solicitud`, `registrar-avance`, `admin-users`, `procesar-notificaciones-pendientes`, and the notification-sending helpers in `_shared/notificaciones.ts` logs with `funcion` + `correlacion_id` (the same id already returned to the client, see "Request correlation" above) — when adding a new Edge Function or catch block, follow this pattern rather than letting an error disappear silently into just the HTTP response. A paid observability vendor (for dashboards/alerting/APM) remains an explicit business decision, not implemented — see `docs/informe-arquitectura-fase-4.md`. `docs/runbook-restauracion-respaldo.md` documents (but doesn't execute) a backup-restore drill procedure.

**Query caching**: `AppProviders`' global `staleTime: 30_000` is the default for any query without its own override. Low-volatility reference/catalog data (`useCatalogo` — clientes, tipos, materiales, vehiculos, ubicaciones, roles — and `useMarca`) overrides this to `staleTime: 5 * 60_000`, since it's only mutated by management roles and local mutations already invalidate instantly; follow this precedent for any new catalog-shaped hook rather than inventing a different value. Deliberately **not** done: server-side/cursor pagination for `listarAdmin()` (the query behind `bandeja-encargado-page.tsx`) — it fetches the full `solicitudes` table and paginates/filters client-side via `GridPagination` (purely presentational, not wired to a server cursor). Converting it would also require rewriting that screen's client-side filters, a high-risk change with no current evidence of a real scale problem — see `docs/informe-arquitectura-fase-3.md` §4 before attempting it.

**Directory layout** (feature-first + Atomic Design, aliased as `@/*` → `src/*`):

- `src/app` — root component and providers (`AppProviders` wires `QueryClient` with `staleTime: 30_000, retry: 1` for queries only — mutations have no automatic retry).
- `src/components/{atoms,molecules,organisms,templates,pages}` — atoms are the local primitive library (button, input, dialog, sheet, etc.); templates are shells (`AppShell`, `AdminShell`); pages compose a role/area's screen.
- `src/features/<domain>/{hooks,types,schemas,lib}` — data fetching/mutation and domain types per feature area (e.g. `operador`, `solicitudes`, `flota`, `catalogos`). Data access stays out of components where practical.
- `src/hooks` — cross-cutting hooks not tied to one feature (e.g. `use-network-status.ts`); this is also the shadcn alias target (`components.json` → `"hooks": "@/hooks"`).
- `src/lib` — `supabase.ts` (client), `i18n.ts` (custom i18n, no external library), `utils.ts` (`cn()`).
- `src/stores/ui.store.ts` — Zustand store persisted to `localStorage` under key `control-solicitudes-ui` (only `idioma` and `menuColapsado` are persisted).
- `supabase/migrations` — sequential, timestamp-named SQL files; the schema/RLS/business-rule source of truth. Seed/demo inserts use fixed UUIDs with `on conflict do nothing` so migrations stay idempotent on re-run.
- `supabase/functions` — Edge Functions: `admin-users` (the only one using the `service_role` key, for user management), `gestionar-solicitud` (state transitions/SLA), `registrar-avance` (operator progress, transactional), plus `_shared/` (CORS, email helpers). Functions mostly validate the caller's role then execute with the caller's own JWT so RLS and audit columns (`cambiado_por`, etc.) reflect the real user; heavy transactional logic itself typically lives in Postgres functions (`security definer`, `set search_path = ''`) invoked via `supabase.rpc(...)`, not in application code.

**i18n**: `src/lib/i18n.ts` defines a single `mensajes` object with `es`/`en` blocks; `ClaveTraduccion` is derived as `keyof typeof mensajes['es']`, so TypeScript forces every key to exist in both languages. Use `useI18n()` → `t(clave)`. Adoption is incremental — several existing organisms (e.g. field-entry forms) still hardcode Spanish strings; new user-facing text should go through this system.

**Domain model note**: route/dispatch planning moved from a 1:1 "ruta per solicitud" model to grouped **rutas de proceso** (`rutas_proceso`, `ruta_solicitudes`, `ruta_vehiculos`, `ruta_movimientos_vehiculo`) that bundle multiple requests, vehicles, a responsible operator/encargado, and fleet cost tracking (fuel, mileage, expenses, depreciation) into one dispatch unit. This was an additive migration (`20260813100000_gestion_flota_rutas.sql`); the older `rutas` table and its UI still exist in the schema/codebase but are no longer wired into any screen.

**Design system**: `DESIGN.md` is the authoritative reference for color tokens, typography scale, breakpoints, motion, and component rules — but code is the source of truth on any discrepancy (`src/styles/globals.css` for CSS variables, `tailwind.config.ts` for their Tailwind exposure, `src/components/atoms` for primitive APIs). Known rules worth internalizing before writing UI: mobile-first (base = 1 column, `sm` 2 columns, `md` content grids, `lg` navigation/panels), ≥44px touch targets (`min-h-11`/`size-11`) on primary/icon buttons, always provide loading (`Skeleton`)/empty/error (`role="alert"`)/success (Sonner toast) states, use `Dialog`/`AlertDialog`/`Sheet` rather than hand-rolled overlays, and prefer semantic tokens (`bg-card`, `text-muted-foreground`, `border-input`) over literal Tailwind colors.

**TypeScript strictness**: `noUnusedLocals` and `noUnusedParameters` are enabled (`tsconfig.app.json`), so unused destructured bindings fail the build, not just lint. When you need to pass a value that structurally has extra properties (e.g. an object with a `key` used only for React's list rendering), it's fine to pass the variable as-is rather than destructuring it away — TypeScript's excess-property check only applies to object literals, not variables, so extra fields pass through harmlessly at the type level.

**Lint discipline**: there are no `eslint-disable` comments anywhere in this codebase — that convention is intentional, not accidental. If `react-hooks/exhaustive-deps` complains about depending on individual properties of an object returned fresh from a hook each render, depend on the whole object (or capture the value in a `ref` if you need it read-only inside a cleanup/guard without retriggering the effect) instead of suppressing the warning.

**Formatting**: Prettier config is no semicolons, single quotes, trailing commas everywhere, 100-char print width (`.prettierrc.json`). Run `npm run format` rather than hand-formatting.
