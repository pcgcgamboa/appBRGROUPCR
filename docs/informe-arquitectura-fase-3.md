# Informe — Fase 3 de la propuesta de arquitectura escalable

**Fecha:** 22 de agosto de 2026
**Alcance:** Fase 3 ("Rendimiento y datos") de `Propuesta_Arquitectura_Escalable_React_Supabase.md`,
continuación de `docs/informe-arquitectura-fase-1.md` y `docs/informe-arquitectura-fase-2.md`.

---

## 1. Resumen ejecutivo

| Elemento | Estado |
|---|---|
| Code-splitting a nivel de ruta (`React.lazy` + `Suspense`) para las ~24 páginas | ✅ Hecho — chunk principal baja de 673 kB a 260,58 kB, desaparece la advertencia de build "chunk larger than 500 kB" |
| Estrategia de `Suspense` en dos niveles (raíz + anidado por shell con sub-secciones) | ✅ Hecho — evita parpadeo del encabezado/sidebar al navegar entre secciones de un mismo rol |
| Caché selectiva (`staleTime`) para datos de catálogo de baja volatilidad | ✅ Hecho — `useCatalogo` (clientes, tipos, materiales, vehículos, ubicaciones, roles) alineado con el precedente ya existente en `useMarca` |
| Paginación server-side/cursor para `listarAdmin()` (bandeja de solicitudes) | ⏸️ Diferido deliberadamente — ver sección 4 |
| Revisión de índices vía `EXPLAIN ANALYZE` | ⏸️ Diferido — sin datos/tráfico de producción disponibles en este entorno |
| Política de retención/archivado (auditoría, notificaciones, adjuntos) | ⏸️ Diferido — requiere una decisión de negocio que solo puede tomar el usuario |

### Verificación final (repo completo, sobre el estado combinado de ambos cambios)

| Verificación | Resultado |
|---|---|
| `npx tsc -b --force` | ✅ Sin errores |
| `npm run lint` | ✅ 0 errores (1 warning preexistente sin relación, en `button.tsx`) |
| `npm run format:check` | ✅ Limpio |
| `npm run build` | ✅ Exitoso — ver tabla de tamaños en sección 2 |
| `npm run test` (Vitest) | ✅ 14/14 |
| `npm run test:e2e` (Playwright, contra build de producción) | ✅ 2/2 — confirma navegación real con lazy-loading funcionando |

---

## 2. Code-splitting a nivel de ruta

### Problema

`src/app/router.tsx` importaba estáticamente las ~24 páginas de los 5 roles (administrador,
encargado, operador, cliente, solicitante). Como no hay router de servidor ni SSR, esto significaba
que abrir la app como cualquier rol descargaba también el código de los otros 4 roles en el chunk
principal — 673 kB antes de comprimir, superando el umbral de advertencia de Vite (500 kB).

### Cambio

Las ~24 páginas pasaron de `import` estático a `React.lazy(() => import(...).then((m) => ({ default:
m.NombreExportado })))` (el `.then` es necesario porque son exports nombrados, no `default`). Cada
`<Route>` de nivel superior envuelve su `element` en `<Suspense fallback={<CargandoRuta />}>`
(`src/components/molecules/cargando-ruta.tsx`, nuevo — spinner + texto reutilizando la clave i18n
`loading` ya existente, sin agregar claves nuevas).

**Estrategia de dos niveles**: además del `Suspense` de nivel raíz en `router.tsx`, se agregó un
`Suspense` anidado alrededor del `<Outlet/>` interno de los tres shells con sub-navegación propia
(`admin-dashboard-page.tsx`, `encargado-dashboard-page.tsx`, `cliente-page.tsx`). Sin esto, cada clic
en una pestaña de sub-sección (p. ej. de "Solicitudes" a "Rutas" dentro de Encargado) dispararía el
`Suspense` de nivel raíz y parpadearía el `AppShell`/sidebar completo mientras carga solo el
contenido interno. Con el `Suspense` anidado, solo el área de contenido bajo las pestañas muestra el
indicador de carga; el encabezado y la navegación permanecen estables.

### Resultado medido (`npm run build`, tamaños sin comprimir)

| Chunk | Antes | Después |
|---|---:|---:|
| Entry principal (`index-*.js`) | 673 kB | 260,58 kB |
| Advertencia "chunk larger than 500 kB" | Presente | Ausente |

El resto del peso se distribuye en chunks por página/dependencia pesada (`graficas-*.js` 460,76 kB,
`supabase-*.js` 219,81 kB, `Tooltip-*.js` 154,52 kB, páginas individuales entre 1-30 kB cada una),
descargados solo cuando el rol/sección correspondiente se visita.

Verificado end-to-end (no solo por tamaño de bundle) vía `npm run test:e2e`: las dos pruebas de
Playwright navegan rutas reales contra `npm run build && npm run preview`, confirmando que la carga
diferida no rompe el renderizado de rutas públicas.

---

## 3. Caché selectiva (`staleTime`)

`src/features/catalogos/hooks/use-catalogo.ts` — el hook genérico que respalda las tablas de
catálogo (clientes, tipos_solicitud, materiales, vehiculos, ubicaciones, roles) — no tenía
`staleTime` configurado, por lo que TanStack Query las revalidaba en cada montaje/foco de ventana
pese a ser datos de baja volatilidad administrados solo por roles de gestión.

Se agregó `staleTime: 5 * 60_000`, igualando el precedente ya existente en `useMarca`
(`src/features/configuracion/hooks/use-marca.ts`). Las mutaciones propias (`guardar`/`eliminar`)
siguen invalidando la query al instante vía `queryClient.invalidateQueries`, así que un cambio hecho
desde la misma sesión se ve de inmediato; el único costo es no ver instantáneamente un cambio hecho
por **otra** sesión concurrente durante esa ventana de 5 minutos — aceptable para datos de
referencia, mismo trade-off ya aceptado en `useMarca`.

No se tocó el `staleTime` global de `AppProviders` (`30_000`, aplicado a queries sin override propio)
ni ningún otro hook — el resto de los dominios (`solicitudes`, `flota`, `notificaciones`, etc.)
maneja datos operativos de mayor volatilidad donde revalidar agresivamente es el comportamiento
correcto.

---

## 4. Ítems diferidos deliberadamente (con razonamiento)

### 4.1 Paginación server-side/cursor para `listarAdmin()`

`bandeja-encargado-page.tsx` consume `useSolicitudesAdmin()` → `listarAdmin()`, que trae la tabla
`solicitudes` completa sin límite, y pagina/filtra **en el cliente** vía `GridPagination`
(confirmado: `src/components/molecules/grid-pagination.tsx` es puramente presentacional — recibe un
`total` ya cargado en memoria y solo hace slicing local; no está conectado a ningún parámetro de
página/cursor del servidor).

Convertir esto a paginación real por cursor requeriría además reescribir los filtros de esa misma
pantalla (hoy también client-side, sobre el dataset completo ya en memoria) para que viajen al
servidor junto con el cursor — un cambio de alto riesgo en una pantalla de uso intensivo diario, para
un problema de escala del que no hay evidencia real todavía (no hay datos de producción ni métricas
de tamaño de tabla en este entorno). Consistente con el principio ya establecido en `CLAUDE.md`
("no diseñar para requisitos hipotéticos futuros"), se deja documentado como el punto a atacar
primero si el volumen real de `solicitudes` empieza a degradar el tiempo de carga de esa bandeja.

### 4.2 Revisión de índices vía `EXPLAIN ANALYZE`

Bloqueado por la misma razón: no hay acceso a datos ni tráfico de producción reales en este entorno
para generar planes de consulta representativos. Optimizar índices sin evidencia de qué consultas son
lentas en la práctica sería trabajo especulativo.

### 4.3 Política de retención/archivado

Afecta datos de auditoría (`automatizacion_ejecuciones`), notificaciones (`notificaciones_envios`) y
adjuntos en Storage. Cuánto tiempo conservar cada uno es una decisión de negocio/cumplimiento que
excede lo que un agente de código puede decidir por su cuenta — queda pendiente de que el usuario
defina los plazos requeridos.

---

## 5. Archivos modificados

- `src/app/router.tsx` — reescrito: imports estáticos → `React.lazy`, `Suspense` en cada ruta de
  nivel superior.
- `src/components/molecules/cargando-ruta.tsx` — nuevo, fallback de `Suspense` reutilizable.
- `src/components/pages/admin/admin-dashboard-page.tsx`,
  `src/components/pages/encargado/encargado-dashboard-page.tsx`,
  `src/components/pages/cliente/cliente-page.tsx` — `Suspense` anidado alrededor del `<Outlet/>`
  propio.
- `src/features/catalogos/hooks/use-catalogo.ts` — `staleTime: 5 * 60_000` en la query de listado.
