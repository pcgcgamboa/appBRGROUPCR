# Estado de la arquitectura según la propuesta escalable

**Fecha de evaluación:** 21 de agosto de 2026  
**Documento de referencia:** `Propuesta_Arquitectura_Escalable_React_Supabase.md`  
**Alcance:** evaluación documental y del repositorio; no se realizaron cambios en el sistema.

## 1. Resumen ejecutivo

La arquitectura actual cumple la base recomendada por la propuesta: continúa como un **monolito
modular**, utiliza React y TypeScript, organiza el frontend por dominios y Atomic Design, y conserva
PostgreSQL como fuente de verdad con RLS, RPC, Edge Functions y Storage.

La evolución estructural propuesta todavía no ha comenzado formalmente. No existen React Router,
puertos y adaptadores, outbox, workers, observabilidad correlacionada ni pruebas automatizadas. El
sistema sí presenta avances parciales importantes: los comandos críticos de solicitudes y usuarios
ya utilizan Edge Functions/RPC, la auditoría se genera en PostgreSQL, los archivos están separados de
los datos estructurados y existe una disciplina de migraciones y CI básico.

### Estado global estimado

| Área | Estado |
| --- | --- |
| Base tecnológica recomendada | Implementada |
| Monolito modular | Implementado de forma práctica |
| Seguridad PostgreSQL/RLS/RPC | Implementada, requiere pruebas automatizadas |
| BFF selectivo para comandos críticos | Parcialmente implementado |
| Fronteras, puertos y adaptadores | Pendiente |
| Router y carga diferida | Pendiente |
| Procesamiento asíncrono/outbox | Pendiente |
| Estrategia de pruebas | Pendiente |
| Rendimiento y crecimiento gobernados por métricas | Pendiente |
| Observabilidad y continuidad | Pendiente/no evidenciado |

La implementación se encuentra principalmente en el estado previo a la **Fase 0**, aunque algunos
elementos de las fases 1 y 2 ya existen parcialmente por decisiones anteriores.

## 2. Criterio de clasificación

- **Implementado:** existe evidencia directa en el repositorio y corresponde sustancialmente a la
  propuesta.
- **Parcial:** existe una solución útil, pero falta formalización, cobertura o alcance.
- **Pendiente:** no se encontró la capacidad propuesta.
- **No evidenciado:** puede existir en la plataforma o en procesos externos, pero no está documentado
  ni verificable desde el repositorio.
- **Condicionado:** solo debe implementarse cuando métricas o necesidades reales lo justifiquen.

## 3. Comparación de la arquitectura objetivo

| Capacidad propuesta | Estado | Evidencia o situación actual | Brecha principal |
| --- | --- | --- | --- |
| React SPA/PWA | Parcial | Existe SPA en React 18, TypeScript y Vite | No se evidencia configuración PWA ni operación offline completa |
| Capa de aplicación por dominio | Parcial | `src/features` agrupa hooks, tipos y esquemas | Los hooks mezclan caso de uso y acceso a Supabase |
| Puertos y contratos independientes | Pendiente | Los tipos existen por dominio | No hay interfaces de repositorio o servicios independientes del proveedor |
| Adaptadores de infraestructura | Pendiente | `src/lib/supabase.ts` centraliza el cliente | Los hooks conocen tablas, RPC, buckets y Edge Functions |
| API/BFF selectivo | Parcial | `gestionar-solicitud`, `registrar-avance` y `admin-users` | No existe política formal para decidir qué comandos deben pasar por BFF |
| RPC y servicios transaccionales | Implementado | Las migraciones contienen funciones transaccionales y reglas | Falta una matriz automatizada de contratos y permisos |
| PostgreSQL + RLS | Implementado | Esquema, políticas y funciones viven en migraciones | No hay pruebas automáticas de la matriz de acceso |
| Outbox | Pendiente | Auditoría y notificaciones se generan en transacciones/triggers | No existe `integration_outbox` ni entrega desacoplada |
| Workers e integraciones asíncronas | Pendiente | No se encontraron workers | Los efectos externos futuros podrían quedar acoplados al comando |
| Storage para binarios | Implementado | Evidencias, documentos, comunicaciones y fotos usan Storage | Falta documentar ciclo de vida, retención y análisis de archivos |
| Observabilidad central | Pendiente | Hay tracking funcional de negocio | No hay logs estructurados, métricas técnicas ni trazas correlacionadas |

## 4. Estado de las fortalezas que la propuesta recomienda conservar

### 4.1 PostgreSQL como fuente de verdad — Implementado

El dominio permanece relacional y transaccional. Las migraciones constituyen la fuente de verdad del
esquema, restricciones, relaciones, funciones, triggers, RLS y buckets.

### 4.2 RLS como frontera de autorización — Implementado

La autorización no depende exclusivamente de la interfaz. Existen migraciones específicas para
roles, RLS, acceso por cliente y protección de operaciones sensibles.

**Estado de calidad:** funcional, pero sin una suite automatizada que verifique cada rol y política.

### 4.3 Operaciones atómicas mediante RPC — Implementado

Los cambios complejos de solicitudes, rutas y avances se apoyan en funciones PostgreSQL. Las
funciones privilegiadas utilizan `security definer` y control de `search_path` según la convención
del proyecto.

### 4.4 Edge Functions para orquestación — Implementado parcialmente

Existen tres Edge Functions:

- `admin-users`;
- `gestionar-solicitud`;
- `registrar-avance`.

Cubren administración de Auth y comandos sensibles del ciclo de solicitudes. La propuesta requiere
formalizar los criterios para que nuevos comandos no elijan arbitrariamente entre SDK, RPC y Edge
Function.

### 4.5 Archivos fuera de PostgreSQL — Implementado

Los binarios se almacenan en Supabase Storage y PostgreSQL conserva metadatos y relaciones. Este
patrón ya se aplica a solicitudes, documentos de clientes, comunicaciones y vehículos.

### 4.6 Organización feature-first y Atomic Design — Implementado

El frontend separa `features` por dominio y componentes por nivel de composición. Se añadieron
patrones visuales reutilizables como `WorkspacePanel` y `DisclosurePanel`.

### 4.7 Auditoría transaccional — Implementado

Existen líneas de tiempo para solicitudes y rutas. Los triggers registran cambios de estado,
asignaciones, avances, materiales, adjuntos, técnicos, validaciones, rutas y automatizaciones.

La auditoría funcional no equivale aún a observabilidad técnica: faltan correlación, latencia,
métricas y trazas entre navegador, funciones y base.

## 5. Estado de las brechas prioritarias

### 5.1 Acoplamiento directo con Supabase — Pendiente

Los hooks de `src/features` importan el cliente de Supabase y conocen nombres físicos de tablas,
relaciones, RPC y funciones. La división por dominio mejora la organización, pero no constituye una
frontera de infraestructura.

La propuesta plantea introducir gradualmente:

```text
Componente
  → caso de uso
  → puerto tipado
  → adaptador Supabase/API
```

Este cambio todavía no está implementado.

### 5.2 React Router y carga diferida — Pendiente

`HomePage` selecciona la experiencia mediante sesión, rol y estado local. Los dashboards cambian de
módulo sin URL. Solo `/bolsa-empleo` se detecta mediante `window.location.pathname`.

Consecuencias actuales:

- no existen enlaces profundos;
- el historial del navegador no representa la navegación interna;
- no hay separación de bundles por ruta;
- una recarga no conserva el módulo interno seleccionado.

El build actual también advierte que el bundle principal supera 500 kB, lo que refuerza la
recomendación de lazy loading.

### 5.3 Pruebas automatizadas — Pendiente

Playwright figura como dependencia, pero no existe configuración ni archivos de prueba. CI ejecuta:

- lint;
- comprobación de formato;
- TypeScript y build.

No se encontraron pruebas unitarias, de componentes, contratos, integración, RLS, RPC, E2E,
rendimiento o resiliencia.

### 5.4 Selección uniforme de SDK/RPC/Edge — Parcial

La práctica actual es razonable: lecturas y CRUD autorizados usan el SDK, mientras operaciones
críticas usan RPC o Edge Functions. Sin embargo, esta decisión vive en convenciones y conocimiento
del equipo; no existe una matriz de comandos, un puerto común ni una regla verificable.

### 5.5 Notificaciones dentro de la transacción — Pendiente de desacoplamiento

Las notificaciones y actividades internas se generan mediante funciones y triggers. Esto garantiza
consistencia, pero no existe un outbox ni procesamiento asíncrono con reintentos, idempotencia y
estado de entrega.

El tracking interno puede permanecer transaccional. Correos, mensajería e integraciones externas
deberían migrar a outbox antes de crecer en volumen o criticidad.

### 5.6 Observabilidad — Pendiente

No se encontraron:

- SLO formalizados;
- `correlation_id` de extremo a extremo;
- logs estructurados comunes;
- métricas p50/p95/p99;
- trazas distribuidas;
- alertas basadas en objetivos de servicio;
- tableros técnicos de capacidad y errores.

Los reportes y el tracking existentes son capacidades funcionales, no una plataforma de
observabilidad.

### 5.7 Formularios — Parcial

React Hook Form y Zod están instalados y se utilizan en algunas áreas. Otros organismos continúan
con estado React y validación HTML manual. No existe todavía un estándar único por tipo de
formulario.

### 5.8 Datos, paginación y retención — Parcial

La interfaz ofrece filtros y paginación de diez elementos en varios listados y tracking. En varios
casos, sin embargo, los datos se descargan primero y se filtran o paginan en memoria.

Falta:

- paginación por cursor desde servidor para tablas crecientes;
- límites obligatorios en todas las consultas;
- revisión documentada de planes de ejecución;
- umbrales para índices o particionamiento;
- políticas de retención, archivado y eliminación;
- ciclo de vida de archivos.

### 5.9 Reportes — Parcial

Existen funciones y vistas de reporte, paneles de métricas, costos de materiales y flota. No hay
evidencia de contención actual ni justificación para separar analítica todavía.

Las vistas materializadas, réplicas o un almacén analítico son decisiones condicionadas a mediciones
de carga y consultas lentas.

## 6. Estado del plan incremental

### Fase 0 — Medición y decisiones

| Entregable | Estado | Observación |
| --- | --- | --- |
| SLO | Pendiente | No se encontraron objetivos operativos aprobados |
| Volúmenes esperados | Pendiente | No están documentados a 1, 3 y 5 años |
| Clasificación de datos | Pendiente | Existen controles, no una clasificación formal |
| RPO/RTO | Pendiente | No están documentados por proceso |
| Registro ADR | Pendiente | No existe directorio o plantilla de decisiones |
| Medición del bundle | Parcial | Vite reporta tamaño; no hay presupuesto o histórico |
| Consultas lentas y latencias | Pendiente | No hay medición documentada |
| Crecimiento por tabla/bucket | Pendiente | No hay umbrales definidos |

**Estado de fase:** no iniciada formalmente.

### Fase 1 — Fronteras y calidad

| Entregable | Estado | Observación |
| --- | --- | --- |
| React Router | Pendiente | Navegación basada en estado |
| Lazy loading por módulo | Pendiente | No se encontraron imports dinámicos por ruta |
| Puertos/adaptadores en `solicitudes` | Pendiente | Hooks acoplados al SDK |
| Puertos/adaptadores en `auth` | Pendiente | Hooks acoplados a Supabase Auth |
| Unificación de formularios | Parcial | RHF/Zod convive con `useState` |
| Pruebas unitarias/componentes | Pendiente | Sin framework o suite configurada |
| Playwright | Pendiente | Dependencia sin configuración ni specs |
| Pruebas RLS/RPC en CI | Pendiente | CI no inicia una base de pruebas |

**Estado de fase:** avances de organización, sin ejecución de los entregables principales.

### Fase 2 — Integración segura

| Entregable | Estado | Observación |
| --- | --- | --- |
| Matriz de comandos críticos | Pendiente | Hay criterios implícitos, no formalizados |
| BFF para comandos sensibles | Parcial | Tres Edge Functions cubren capacidades clave |
| Errores estandarizados | Parcial | Hay manejo por función, no contrato transversal |
| Correlación | Pendiente | Sin identificador propagado |
| Idempotencia | Parcial/no evidenciada | Atomicidad sí; claves idempotentes no formalizadas |
| Contratos independientes | Pendiente | Se exponen formas cercanas al esquema físico |
| Outbox | Pendiente | No existe tabla ni procesador |
| Workers | Pendiente | No existen consumidores asíncronos |

**Estado de fase:** parcialmente anticipada por Edge Functions y RPC existentes.

### Fase 3 — Rendimiento y datos

| Entregable | Estado | Observación |
| --- | --- | --- |
| Carga diferida | Pendiente | Bundle principal monolítico |
| Proyecciones específicas | Parcial | Los hooks seleccionan columnas explícitas en muchos casos |
| Paginación por cursor | Pendiente | Predomina paginación local |
| Revisión de índices con métricas | No evidenciado | Existen índices, no una revisión basada en planes |
| Caché selectiva | Parcial | React Query usa `staleTime` global de 30 s |
| Retención y archivado | Pendiente | Sin políticas documentadas |

**Estado de fase:** prácticas básicas presentes; estrategia de escala pendiente.

### Fase 4 — Observabilidad y continuidad

| Entregable | Estado | Observación |
| --- | --- | --- |
| Logs estructurados | Pendiente | Sin esquema común verificable |
| Métricas y trazas | Pendiente | Sin instrumentación de extremo a extremo |
| Tableros técnicos | Pendiente | Los tableros actuales son funcionales |
| Alertas por SLO | Pendiente | No existen SLO definidos |
| Pruebas de restauración | No evidenciado | Puede depender de operación externa |
| Simulacros de fallos | No evidenciado | No se encuentran procedimientos |

**Estado de fase:** no iniciada.

### Fase 5 — Escalamiento basado en evidencia

| Entregable | Estado | Observación |
| --- | --- | --- |
| Réplicas o particiones | Condicionado | Correctamente no implementadas sin métricas |
| Almacén analítico | Condicionado | No se ha demostrado necesidad |
| Extracción de servicios | Condicionado | El monolito modular sigue siendo apropiado |
| Revisión periódica de costos | No evidenciado | Proceso operativo externo al repositorio |

**Estado de fase:** no corresponde iniciar antes de completar medición y calidad.

## 7. Recomendaciones priorizadas actualizadas

El orden propuesto sigue siendo válido, pero conviene insertar una etapa de evidencia antes de
modificar la estructura:

1. **Completar la Fase 0:** acordar SLO, RPO/RTO, volúmenes y ADR antes de refactorizar.
2. **Configurar pruebas de RLS/RPC y recorridos críticos:** proteger el comportamiento existente.
3. **Introducir puertos y adaptadores de forma piloto:** comenzar con una lectura y un comando de
   `solicitudes`, sin reescribir todos los hooks.
4. **Adoptar Router y lazy loading:** conservar el cambio de rol, pero representar módulos y vistas
   en URLs navegables.
5. **Formalizar la matriz SDK/RPC/BFF:** clasificar los comandos actuales y usarla para cambios
   nuevos.
6. **Implementar outbox antes de ampliar integraciones:** mantener auditoría local transaccional y
   desacoplar entregas externas.
7. **Mover tracking y listados crecientes a paginación de servidor:** priorizar actividades,
   comunicaciones y notificaciones.
8. **Instrumentar correlación y latencia:** medir antes de introducir caché, particiones o réplicas.
9. **Definir retención y ciclo de vida:** incluir auditoría, notificaciones, adjuntos y documentos.
10. **Mantener el monolito modular:** no existe evidencia actual que justifique microservicios o
    Kubernetes.

## 8. Próximo hito recomendado

El siguiente hito no debería ser una migración tecnológica amplia. Se recomienda un **Hito de
Fundación Arquitectónica** con entregables acotados:

1. Documento de SLO, RPO/RTO, volúmenes y clasificación de datos.
2. Carpeta de ADR con decisiones sobre router, BFF, puertos y pruebas.
3. Base de pruebas para una política RLS, una RPC y un flujo E2E crítico.
4. Piloto de puerto/adaptador para `solicitudes` sin cambiar el contrato visual.
5. Medición inicial de bundle, latencia, consultas lentas y crecimiento.

Este hito reduce el riesgo de la evolución propuesta y permite cuantificar el resultado de cada fase.

## 9. Conclusión

El sistema conserva una arquitectura adecuada para su etapa actual y no requiere reemplazo. Las
fortalezas centrales de la propuesta ya están presentes: monolito modular, PostgreSQL, RLS, RPC,
Edge Functions, Storage, migraciones y auditoría transaccional.

La deuda principal no es de capacidad funcional, sino de **fronteras técnicas, verificabilidad y
operación**. La prioridad debe ser medir, automatizar pruebas y desacoplar progresivamente los casos
de uso del SDK antes de incorporar procesamiento asíncrono o infraestructura especializada.
