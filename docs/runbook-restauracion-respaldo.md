# Runbook — simulacro de restauración de respaldo

**Estado:** procedimiento documentado, **no ejecutado todavía** en este entorno (ver "Por qué no se
ejecutó" abajo). Forma parte de la Fase 4 ("Observabilidad y continuidad") de
`docs/informe-arquitectura-fase-4.md`.

## Objetivo

Verificar, de forma periódica y no destructiva, que un respaldo real de la base de datos de
producción se puede restaurar y produce un sistema funcional — no basta con que Supabase reporte que
el respaldo "existe"; hay que probar la restauración en sí, porque es el único momento en que un
respaldo corrupto o incompleto se revela.

## Alcance de este documento

Describe el procedimiento para que **el responsable del proyecto** (con acceso a la consola de
Supabase y, si aplica, a facturación) lo ejecute manualmente. No se automatiza ni se ejecuta desde
este repositorio ni por un agente de código: restaurar un respaldo, aunque sea sobre un proyecto de
prueba, es una operación con consecuencias reales (costo de un proyecto adicional, tiempo de
restauración, posible exposición de datos si el proyecto de prueba no se protege igual que
producción) que requiere una decisión humana explícita en el momento de ejecutarla.

## Procedimiento

1. **Confirmar el plan y la retención de respaldos activa** en Supabase → Project Settings →
   Database → Backups. En el plan Pro o superior, Point-in-Time Recovery (PITR) permite restaurar a
   cualquier instante dentro de la ventana de retención contratada; en el plan Free solo hay
   respaldos diarios sin PITR — confirmar cuál aplica antes de asumir una ventana de recuperación
   (RPO) específica.
2. **Crear un proyecto Supabase nuevo y separado** exclusivamente para el simulacro (no restaurar
   sobre el proyecto de producción ni sobre uno usado para desarrollo activo). Esto aísla el
   simulacro de cualquier riesgo de sobrescribir datos reales.
3. **Restaurar el respaldo/punto-in-time elegido** sobre ese proyecto nuevo, siguiendo el flujo de
   Supabase Dashboard → Database → Backups → Restore (o `supabase db dump`/`pg_restore` manual si el
   plan no ofrece restauración con un clic — confirmar contra la documentación de Supabase vigente
   al momento de ejecutar, ya que este flujo cambia entre planes).
4. **Verificar integridad de datos post-restauración**, como mínimo:
   - Conteo de filas de las tablas críticas (`solicitudes`, `usuarios`, `notificaciones_envios`,
     `automatizacion_ejecuciones`) comparado contra un conteo tomado en producción justo antes del
     respaldo restaurado.
   - Que las políticas RLS y funciones `security definer` existan y sean invocables (ejecutar una
     consulta de prueba autenticada, no solo verificar que las filas de `pg_proc`/`pg_policies`
     existan).
   - Que Storage (adjuntos/fotos) sea accesible si el plan de respaldo incluye buckets — Supabase
     respalda la base de datos por defecto; los objetos de Storage pueden requerir una estrategia de
     respaldo separada, confirmar cuál aplica.
5. **Desplegar temporalmente el frontend** (o correr `npm run build && npm run preview`) apuntando al
   proyecto restaurado, y ejercer manualmente 2-3 flujos críticos (login, crear solicitud, ver
   bandeja) para confirmar que el sistema es usable, no solo que la base de datos tiene filas.
6. **Registrar el resultado** (fecha, duración total desde "restore" hasta "verificado", cualquier
   discrepancia encontrada) en un documento de bitácora interno del equipo — este runbook no
   prescribe dónde, pero debe quedar rastreable para auditoría.
7. **Eliminar el proyecto de prueba** al terminar, para no acumular costo ni superficie de datos
   sensibles expuesta innecesariamente.

## Periodicidad sugerida

Trimestral, o inmediatamente después de cualquier cambio estructural grande a la base de datos
(migración con reescritura de tablas grandes, cambio de proveedor, etc.). La propuesta de
arquitectura original no fija una cadencia — es una decisión operativa del equipo, no de código.

## Por qué no se ejecutó en esta sesión

- Ejecutar este procedimiento implica crear un proyecto Supabase adicional (posible costo) y
  restaurar sobre él — ambas son acciones con efectos fuera de este repositorio que requieren
  autorización explícita y presencia humana en la consola de Supabase, no delegable a un agente de
  código en este entorno.
- Este entorno no tiene credenciales de facturación ni acceso a la consola de Supabase más allá de
  lo que ya está vinculado para `supabase db push`/`functions deploy` (comandos que, por instrucción
  del usuario, tampoco se ejecutan desde aquí).

## Qué sí se automatizó (relacionado, ver Fase 4)

El "simulacro de restauración" en sí sigue siendo manual, pero la **detectabilidad** de fallos que
lo motivan mejoró en esta fase: los tres Edge Functions críticos (`gestionar-solicitud`,
`registrar-avance`, `admin-users`) y el worker de notificaciones ahora emiten logs estructurados con
`correlacion_id` en cada error — visibles de inmediato en Supabase → Edge Functions → Logs, sin
depender de que un usuario reporte el problema primero.
