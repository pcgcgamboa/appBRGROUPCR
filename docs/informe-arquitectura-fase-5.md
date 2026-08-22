# Informe — Fase 5 de la propuesta de arquitectura escalable

**Fecha:** 22 de agosto de 2026
**Alcance:** Fase 5 ("Escalamiento basado en evidencia") de
`Propuesta_Arquitectura_Escalable_React_Supabase.md`, última fase de la hoja de ruta iniciada en
`docs/informe-arquitectura-fase-1.md`.

---

## 1. Resumen ejecutivo

La propuesta original nombra esta fase explícitamente "basado en evidencia" — no es una lista de
tareas a ejecutar, sino un conjunto de decisiones de infraestructura (réplicas de lectura,
particionamiento de tablas, un almacén analítico separado, extracción de servicios) que **solo deben
tomarse cuando datos reales de producción demuestren que hacen falta**. Implementarlas ahora, sobre
una base con datos de demostración y sin tráfico real, violaría el principio ya establecido en
`CLAUDE.md` de no diseñar para requisitos hipotéticos futuros — sería trabajo especulativo, no
arquitectura basada en evidencia.

| Elemento de la propuesta | Estado | Qué se hizo en su lugar |
|---|---|---|
| Réplicas de lectura | ⏸️ No implementado — sin evidencia | Criterio de activación documentado (sección 2.1) |
| Particionamiento de tablas | ⏸️ No implementado — sin evidencia | Criterio de activación documentado (sección 2.2) |
| Almacén analítico separado | ⏸️ No implementado — sin evidencia | Criterio de activación documentado (sección 2.3) |
| Evaluación de extracción de servicios | ⏸️ No implementado — sin evidencia | Criterio de activación documentado (sección 2.4) |

No hay cambios de código en esta fase. El resultado es puramente documental: una lista verificable de
umbrales, para que la primera vez que alguien (persona o agente) tenga datos reales de producción
disponibles, pueda decidir con criterio en vez de reabrir esta pregunta desde cero.

---

## 2. Criterios de activación por ítem

Cada criterio está pensado para poder verificarse con una consulta simple contra el propio Postgres
de producción o contra métricas ya visibles en el Dashboard de Supabase — nada de esto requiere
instrumentación nueva.

### 2.1 Réplicas de lectura

**Activar cuando**: el CPU/IO de la instancia primaria de Postgres se sostiene por encima del 70-80%
en horario pico **y** el perfil de carga es predominantemente de lectura (bandejas, reportes,
tracking) más que de escritura — verificable en Supabase Dashboard → Reports → Database.
**No antes**: con datos de demostración, la instancia por defecto de Supabase no se acerca a ese
umbral; agregar una réplica sin esa presión es costo recurrente sin beneficio medible.

### 2.2 Particionamiento de tablas

**Activar cuando**: `solicitudes`, `automatizacion_ejecuciones` o `notificaciones_envios` superen
~5-10 millones de filas **o** un `EXPLAIN ANALYZE` real muestre que una consulta frecuente (p. ej. la
que respalda `listarAdmin()`, ya señalada como candidata a paginación por cursor en
`docs/informe-arquitectura-fase-3.md` §4.1) hace un secuencial scan costoso pese a tener el índice
correcto. Particionar (por rango de fecha, típicamente `creado_en`) antes de ese punto añade
complejidad operativa (mantenimiento de particiones, `VACUUM` por partición) sin beneficio.
**Dependencia**: conviene resolver primero la paginación por cursor (Fase 3) — cambia el patrón de
acceso y podría mover el umbral en el que particionar deja de ser necesario.

### 2.3 Almacén analítico separado

**Activar cuando**: los reportes (`reportes-page.tsx`, gráficas de `recharts`) empiecen a competir por
recursos con las cargas operativas transaccionales (creación/gestión de solicitudes en tiempo real), o
cuando el negocio pida análisis histórico/agregado a una escala que ya no sea razonable calcular
on-the-fly desde las tablas operativas (ej. tendencias multi-año, cruces con datos externos). Antes de
eso, replicar a un almacén separado (o incluso una vista materializada dentro del mismo Postgres) es
una capa de infraestructura sin problema real que resolver.

### 2.4 Evaluación de extracción de servicios

**Activar cuando** un dominio concreto (ej. notificaciones, flota) tenga un ciclo de despliegue,
escalamiento o equipo responsable genuinamente distinto del resto del sistema — no antes. La
arquitectura actual (ports/adapters por dominio en `src/features/**`, Fase 1) ya deja cada dominio
con una frontera de código clara; extraerlo a un servicio separado es, en ese sentido, un cambio de
*despliegue*, no de *diseño de código* — el acoplamiento ya está roto donde más importa. Hacerlo sin
una razón organizacional o de escala real agregaría la complejidad operativa de una arquitectura
distribuida (red, versionado de contratos, consistencia eventual) a cambio de nada.

---

## 3. Preguntas abiertas que siguen sin respuesta

Las mismas ya planteadas en `docs/informe-arquitectura-fase-1.md` §5 y nunca respondidas porque
requieren una decisión de negocio: volumen esperado de usuarios/solicitudes a 1-3-5 años, retención
esperada de fotografías/documentos, requisitos de residencia de datos o conservación legal, RPO/RTO
exigido, si el sistema será multiempresa, y qué reportes requieren datos en tiempo real vs.
consolidados. Cualquiera de los 4 ítems de esta fase se decide más rápido y con menos riesgo una vez
que estas preguntas tengan respuesta, incluso antes de que la evidencia de producción esté disponible.

---

## 4. Cierre de la hoja de ruta (Fases 0-5)

Con este informe se documentan las 6 fases (0 a 5) de
`Propuesta_Arquitectura_Escalable_React_Supabase.md`. Las Fases 0-4 tuvieron trabajo ejecutable y
verificado (`docs/informe-arquitectura-fase-1.md` a `-4.md`); la Fase 5 se cierra deliberadamente sin
cambios de código, documentando en su lugar los umbrales que deberían disparar cada decisión cuando
haya datos reales que lo justifiquen. Ver `docs/informe-arquitectura-general.md` para el resumen
consolidado de la iniciativa completa.
