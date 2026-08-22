# Propuesta de mejoras — evolución SRM, Ticketing, CRM y TMS

> **Fecha de análisis:** 20 de agosto de 2026  
> **Base evaluada:** requerimientos funcionales vigentes, sistema de diseño y módulos implementados en el repositorio.  
> **Propósito:** proponer una evolución ordenada del Sistema de Solicitudes de Servicio tomando patrones de plataformas SRM, sistemas de tickets, CRM y TMS, sin perder el enfoque operativo actual ni introducir complejidad antes de que aporte valor.

## 1. Resumen ejecutivo

El software ya dispone de una base sólida: solicitudes con SLA, flujo de estados, asignación de operadores y técnicos, atención en campo, materiales, rutas agrupadas, flota, proveedores, clientes, notificaciones, auditoría y reportes. Esta combinación lo acerca a una plataforma de **gestión de servicios de campo**.

La principal oportunidad no consiste en crear cuatro sistemas separados, sino en conectar las capacidades actuales mediante una visión común:

- **Ticketing:** convertir la solicitud en un expediente operativo completo, trazable, colaborativo y automatizado.
- **CRM:** consolidar la relación con el cliente, sus contactos, activos, acuerdos, comunicaciones y satisfacción.
- **SRM:** convertir el catálogo de proveedores en un proceso de abastecimiento, evaluación y control de cumplimiento.
- **TMS:** evolucionar las rutas actuales hacia planificación, despacho, seguimiento y optimización logística.

Se recomienda comenzar por mejoras de alto impacto y dependencia baja: comentarios y menciones, SLA operativo con escalamiento, centro de notificaciones, búsqueda global, historial del cliente, acuerdos de servicio y evaluación básica de proveedores. La optimización automática de rutas, telemetría, portal completo de proveedores e inventario avanzado deben abordarse después de consolidar datos confiables.

## 2. Principios de evolución

1. **Una única fuente de verdad:** la solicitud debe ser el eje que relaciona cliente, ubicación, activos, personas, materiales, proveedores, ruta, costos, comunicaciones y evidencias.
2. **Configuración antes que código:** estados secundarios, reglas de asignación, escalamiento, plantillas y matrices de evaluación deben parametrizarse cuando sea razonable.
3. **Automatizar con trazabilidad:** toda regla automática debe explicar qué ejecutó, cuándo, por qué y con qué resultado.
4. **Datos confiables antes de optimización:** no se debe implementar planificación predictiva o rutas optimizadas sin direcciones, coordenadas, tiempos y capacidades suficientemente completos.
5. **Autoservicio con control:** clientes y proveedores deben poder colaborar sin acceder a información interna ni saltarse aprobaciones.
6. **Mobile-first y operación degradada:** el trabajo de campo debe seguir siendo práctico con conectividad limitada.
7. **Implementación incremental:** cada incremento debe entregar valor independiente y ser medible.

## 3. Diagnóstico resumido

| Área | Capacidad actual | Brecha principal |
|---|---|---|
| Solicitudes | Flujo, prioridades, SLA, avances, adjuntos y auditoría | Falta colaboración interna, automatización, colas, clasificación y conocimiento reutilizable |
| Clientes | Catálogo, contactos, ubicaciones y validación del cierre | Falta vista 360°, activos instalados, contratos, historial de comunicaciones y portal completo |
| Proveedores | Directorio y descripción libre de artículos/servicios | Falta homologación, cotización, órdenes, desempeño, documentos, riesgo y portal |
| Transporte | Rutas con solicitudes, vehículos, responsable y movimientos | Falta planificación por capacidad/ventana, despacho, seguimiento, prueba de servicio y optimización |
| Reportes | Solicitudes, SLA, materiales y flota | Falta análisis transversal de costos, productividad, experiencia, proveedores y logística |
| Plataforma | RLS, transacciones, auditoría, responsive e i18n | Falta router, búsqueda global, observabilidad funcional, tareas programadas y modo offline |

## 4. Mejoras inspiradas en sistemas de ticketing

### 4.1 Expediente y línea de tiempo unificada

Crear una línea de tiempo cronológica por solicitud que combine:

- cambios de estado, prioridad, SLA, responsable y ruta;
- comentarios públicos para el cliente y notas internas;
- menciones a usuarios y seguidores de la solicitud;
- correos enviados/recibidos, adjuntos, avances, materiales y validaciones;
- eventos automáticos, errores de notificación y reaperturas.

Cada evento debe indicar autor, fecha, canal, visibilidad y origen. Esto reduce la fragmentación actual entre historial de estados, avances y notificaciones.

### 4.2 Colas, vistas guardadas y bandejas de trabajo

Incorporar colas configurables como “sin asignar”, “SLA por vencer”, “esperando cliente”, “esperando proveedor”, “reabiertas” o “urgentes”. Permitir filtros combinados, ordenamiento, vistas guardadas personales/compartidas y acciones masivas con permisos.

La asignación puede evolucionar gradualmente:

1. manual asistida, mostrando carga y habilidades;
2. reglas por tipo, ubicación, prioridad, turno y especialidad;
3. balance automático con posibilidad de anulación justificada.

### 4.3 SLA operativo y escalamiento

Ampliar el SLA actual para medir al menos:

- tiempo de primera respuesta;
- tiempo de asignación;
- tiempo de llegada o inicio de atención;
- tiempo de resolución;
- tiempo de espera imputable al cliente o proveedor;
- tiempo de validación y cierre.

Agregar calendarios laborales, feriados, pausas justificadas, metas por contrato y alertas automáticas al 50 %, 75 %, 90 % y al vencer. Las reglas de escalamiento pueden notificar, reasignar o elevar prioridad, pero siempre deben dejar auditoría.

### 4.4 Clasificación, duplicados y relaciones

- Taxonomía jerárquica: categoría, subcategoría, causa, síntoma y código de resolución.
- Detección asistida de solicitudes posiblemente duplicadas por cliente, ubicación, activo, asunto y cercanía temporal.
- Relaciones entre tickets: duplicado de, depende de, bloquea, recurrente o solicitud padre/hija.
- Plantillas para solicitudes y tareas repetitivas.

La clasificación estructurada habilita reportes de causa raíz que el texto libre no permite producir con confiabilidad.

### 4.5 Gestión del conocimiento

Crear una base de conocimiento con artículos versionados, etiquetas, audiencia, revisión, vigencia y aprobación. Al crear o atender un ticket, sugerir artículos según tipo, descripción, activo y causa. Medir visualizaciones, utilidad y casos resueltos sin intervención.

### 4.6 Automatización y tareas

- Reglas “cuando/si/entonces” para asignar, etiquetar, notificar, escalar o crear subtareas.
- Listas de verificación por tipo de servicio.
- Tareas dependientes y aprobaciones para trabajos que requieren autorización.
- Recordatorios y temporizadores mediante procesos programados del servidor, no desde el navegador.
- Macros para respuestas y actualizaciones frecuentes.

### 4.7 Canales y autoservicio

- Portal para crear solicitudes, consultar estado, comentar y adjuntar evidencia.
- Conversión de correo entrante en ticket y asociación de respuestas al expediente.
- Formularios públicos o autenticados por tipo de servicio.
- Centro de notificaciones dentro de la aplicación con preferencias por usuario y canal.
- API y webhooks para integrar formularios, monitoreo u otros sistemas.

Canales como WhatsApp o SMS deben considerarse integraciones posteriores, sujetas a consentimiento, costos y reglas de protección de datos.

## 5. Mejoras inspiradas en CRM

### 5.1 Vista 360° del cliente

Crear una ficha integral con:

- datos de la organización y segmentación;
- contactos, cargos, preferencias y canales autorizados;
- ubicaciones, activos instalados y responsables locales;
- solicitudes abiertas, históricas y recurrentes;
- contratos, niveles de servicio y cobertura;
- comunicaciones, satisfacción, costos e ingresos asociados;
- alertas de riesgo o seguimiento.

La ficha debe enlazar a la información existente y evitar copiar datos derivados.

### 5.2 Contactos y comunicaciones

Normalizar los contactos como entidad independiente, permitiendo varios contactos por cliente y ubicación, roles de contacto y vigencia. Registrar interacciones relevantes —correo, llamada, reunión, comentario o visita— con visibilidad y propósito.

Incluir plantillas de comunicación, preferencias de idioma, consentimiento y reglas de exclusión. Los correos de estado actuales pasarían a formar parte del historial de relación.

### 5.3 Activos del cliente e historial de servicio

Crear un catálogo de activos instalados: tipo, marca, modelo, serie, ubicación, fecha de instalación, garantía, criticidad, estado y documentos. Una solicitud podría asociarse a uno o más activos.

Esto permitiría:

- consultar el historial completo de mantenimiento y fallas;
- detectar recurrencia por equipo o modelo;
- validar garantía y cobertura;
- recomendar mantenimiento preventivo;
- calcular costo total de servicio por activo.

### 5.4 Contratos y acuerdos de servicio

Modelar contratos con vigencia, sedes y activos cubiertos, horarios, exclusiones, bolsa de horas, precios y matriz de SLA. Al crear la solicitud, el sistema debe determinar la cobertura aplicable y conservar una copia de las condiciones utilizadas.

Conviene separar el **SLA contractual** de la prioridad operativa: una urgencia y un compromiso comercial no son el mismo concepto.

### 5.5 Experiencia y satisfacción

Evolucionar la validación binaria actual hacia encuestas configurables:

- CSAT posterior al servicio;
- esfuerzo del cliente (CES);
- recomendación periódica (NPS), si el contexto lo justifica;
- motivo de insatisfacción y acción de recuperación.

Una calificación baja debe crear automáticamente una tarea de seguimiento. Se deben evitar encuestas repetitivas mediante límites de frecuencia.

### 5.6 Gestión proactiva

- Alertas por volumen inusual, solicitudes repetidas o deterioro de satisfacción.
- Planes de mantenimiento preventivo que generen solicitudes futuras.
- Agenda de seguimientos con propietario y fecha límite.
- Segmentación por criticidad, contrato, ubicación o volumen.

El módulo comercial de oportunidades y ventas no es prioritario salvo que el producto también deba gestionar preventa; inicialmente es más valioso un CRM orientado a servicio.

## 6. Mejoras inspiradas en SRM

### 6.1 Maestro y homologación de proveedores

Transformar el directorio actual en un expediente estructurado:

- categorías de bienes y servicios;
- cobertura geográfica, capacidades y especialidades;
- contactos, cuentas bancarias y condiciones de pago, con acceso restringido;
- documentos fiscales, permisos, pólizas y certificaciones con vencimiento;
- estados: prospecto, en evaluación, homologado, suspendido e inactivo;
- duplicados y validaciones por identificación.

La homologación debe usar un flujo de revisión y aprobación, no una simple activación.

### 6.2 Solicitudes de cotización y comparación

Permitir que una necesidad de material o servicio genere una solicitud de cotización a varios proveedores. Registrar precios, impuestos, disponibilidad, plazo, vigencia, condiciones y adjuntos, y ofrecer una matriz comparativa.

La selección debe almacenar criterio y justificación, especialmente cuando no se elige la oferta de menor precio.

### 6.3 Requisiciones, órdenes y recepción

Agregar un flujo liviano:

`Necesidad → Requisición → Aprobación → Cotización → Orden → Recepción → Conciliación`

Las órdenes pueden vincularse a solicitud, ruta, activo o centro de costo. La recepción debe aceptar entregas parciales, rechazo, evidencia y diferencias de cantidad/precio. No se recomienda intentar reemplazar un ERP contable; la integración contable es preferible cuando exista uno.

### 6.4 Desempeño del proveedor

Crear scorecards por período con métricas como:

- puntualidad de entrega;
- cumplimiento de cantidad y especificación;
- tasa de rechazo o retrabajo;
- tiempo de respuesta;
- competitividad de precio;
- documentación vigente;
- incidentes y satisfacción del área solicitante.

Los pesos deben configurarse por categoría. La calificación debe ser explicable y permitir observaciones o planes de mejora.

### 6.5 Riesgo, cumplimiento y continuidad

- Alertas por documentos próximos a vencer.
- Registro de incidentes, sanciones y conflictos de interés.
- Evaluación de dependencia por proveedor único o categoría crítica.
- Proveedores alternos y planes de continuidad.
- Bitácora de cambios en información sensible.

### 6.6 Portal de proveedores

En una fase madura, habilitar autoservicio para actualizar datos, cargar documentos, responder cotizaciones, confirmar órdenes y consultar evaluaciones. Toda modificación sensible debe quedar pendiente de validación interna.

## 7. Mejoras inspiradas en TMS

### 7.1 Planificación operativa enriquecida

Ampliar la ruta de proceso con:

- depósito/base de salida y regreso;
- paradas con ventana horaria, duración estimada y prioridad;
- distancia y tiempo estimados/reales;
- capacidad requerida y disponible por peso, volumen o plazas;
- habilidades necesarias y restricciones del vehículo;
- turno, jornada y disponibilidad del responsable;
- dependencias entre servicios.

Cada parada debe asociarse a una solicitud y conservar su secuencia planificada y real.

### 7.2 Tablero de despacho

Crear una vista diaria/semanal para solicitudes sin planificar, rutas y recursos. Debe permitir asignación mediante acciones accesibles, detectar conflictos y advertir:

- doble reserva de vehículo o persona;
- vehículo indisponible o con mantenimiento vencido;
- exceso de capacidad o jornada;
- ausencia de coordenadas;
- riesgo de incumplir ventanas o SLA.

El mapa debe complementar, no sustituir, una lista accesible.

### 7.3 Optimización de rutas

Implementar por etapas:

1. cálculo de distancia y duración entre paradas;
2. sugerencia de secuencia para una ruta ya formada;
3. agrupación sugerida de solicitudes por zona, ventana, capacidad y SLA;
4. optimización multiobjetivo de flota y personal.

El planificador siempre debe poder ajustar la propuesta y registrar la razón. Antes de seleccionar motor de ruteo se deben evaluar cobertura local, límites, privacidad, costo y posibilidad de autoalojamiento.

### 7.4 Ejecución y seguimiento

- Estados por parada: pendiente, en tránsito, llegó, en servicio, completada, fallida y reprogramada.
- Check-in/check-out con fecha, coordenadas y precisión, con consentimiento y política de retención.
- Hora estimada de llegada recalculada y comunicación proactiva al cliente.
- Registro de desvíos, espera, tráfico, ausencia del cliente o servicio fallido.
- Replanificación controlada ante incidencias.

No se recomienda rastreo continuo de personas como primera medida; los hitos de ubicación son menos invasivos y suelen ser suficientes para validar la operación.

### 7.5 Prueba de servicio y costos

Agregar prueba de servicio: firma, nombre del receptor, fotografías, geolocalización, fecha y observaciones. Relacionar costos de combustible, peajes, viáticos, materiales, horas y vehículo para obtener:

- costo por ruta, parada, solicitud y cliente;
- costo por kilómetro y hora;
- utilización de vehículo y ocupación;
- kilómetros improductivos;
- diferencia planificado versus real.

### 7.6 Mantenimiento de flota

Completar el módulo vigente con planes preventivos por fecha, kilometraje u horas; órdenes de mantenimiento; alertas; historial de talleres y repuestos; inspección preoperacional; incidentes, multas y pólizas. El odómetro debe poder actualizar los próximos vencimientos automáticamente.

## 8. Capacidades transversales

### 8.1 Búsqueda, navegación y productividad

- Búsqueda global por número, texto, cliente, contacto, activo, placa, proveedor o ruta.
- URLs profundas con un router para compartir y restaurar vistas.
- comandos rápidos, filtros persistentes y exportaciones controladas.
- paginación y consultas del lado del servidor para volúmenes altos.

### 8.2 Auditoría y gobierno de datos

- Auditoría consistente para cambios relevantes, no solo estados.
- Catálogo de motivos para cancelación, reapertura, reasignación y excepciones.
- políticas de retención, anonimización y eliminación según obligaciones aplicables;
- clasificación de información sensible y acceso por mínimo privilegio;
- historial de consentimientos y descargas masivas auditadas.

### 8.3 Integraciones

Definir una capa estable mediante API, webhooks salientes con reintentos e idempotencia, y registro de integraciones. Integraciones candidatas:

- ERP/contabilidad para proveedores, órdenes, facturas y centros de costo;
- correo y calendario;
- identidad corporativa mediante SSO;
- mapas/ruteo y, más adelante, telemetría;
- herramientas de BI o almacén de datos.

### 8.4 Operación offline y PWA

Para campo, convertir progresivamente la aplicación en PWA: instalación, caché del shell, borradores locales, cola de operaciones y sincronización visible. Los conflictos deben resolverse de forma explícita. Adjuntos grandes requieren reglas especiales y no deben asumirse cargados hasta confirmación del servidor.

### 8.5 Observabilidad y confiabilidad

- Registro estructurado con identificador de correlación por operación.
- Métricas de errores de funciones, correos, sincronización y reglas automáticas.
- panel de trabajos fallidos con reintento seguro;
- pruebas automáticas de permisos/RLS, funciones críticas y flujos por rol;
- respaldos, restauración probada y objetivos de recuperación documentados.

### 8.6 Analítica y calidad de datos

Crear definiciones únicas para indicadores y registrar calidad de datos: coordenadas faltantes, contactos inválidos, solicitudes sin clasificación, tiempos imposibles y duplicados. Los tableros deberían permitir navegar del indicador al detalle que lo compone.

## 9. Indicadores recomendados

| Dominio | Indicadores |
|---|---|
| Ticketing | primera respuesta, resolución, cumplimiento de SLA, reapertura, backlog por antigüedad, tiempo en cada estado, resolución en primera visita |
| CRM | CSAT/CES, recurrencia por cliente/activo, solicitudes por ubicación, tiempo de recuperación, cobertura contractual, costo de servicio por cliente |
| SRM | puntualidad, cumplimiento completo, rechazo, tiempo de cotización, ahorro frente a referencia, documentos vencidos, concentración de compra |
| TMS | puntualidad de llegada, utilización, km por servicio, km improductivos, costo por km/parada/ruta, duración planificada vs. real, servicios fallidos |
| Plataforma | errores por operación, latencia, correos fallidos, trabajos pendientes, adopción por módulo, calidad y completitud de datos |

Los indicadores deben incluir definición, fórmula, zona horaria, exclusiones, responsable y frecuencia de actualización.

## 10. Priorización propuesta

Escala: impacto y esfuerzo relativos (`Alto`, `Medio`, `Bajo`).

| Prioridad | Mejora | Dominio | Impacto | Esfuerzo | Dependencias |
|---:|---|---|---|---|---|
| P0 | Línea de tiempo, notas internas, comentarios y menciones | Ticketing | Alto | Medio | Modelo de eventos y permisos de visibilidad |
| P0 | Alertas y escalamiento automático de SLA | Ticketing | Alto | Medio | Procesos programados y calendarios |
| P0 | Colas, filtros avanzados y vistas guardadas | Ticketing | Alto | Medio | Consultas paginadas e índices |
| P0 | Búsqueda global y URLs profundas | Transversal | Alto | Medio | Router e índices de búsqueda |
| P0 | Vista 360° e historial del cliente | CRM | Alto | Medio | Normalización de contactos |
| P0 | Calidad de datos, observabilidad y pruebas RLS | Transversal | Alto | Medio | Definiciones operativas |
| P1 | Activos instalados e historial de servicio | CRM | Alto | Medio | Catálogo y relaciones con solicitudes |
| P1 | Contratos, cobertura y SLA contractual | CRM | Alto | Alto | Clientes, activos y calendario SLA |
| P1 | Centro de notificaciones y preferencias | Ticketing/CRM | Alto | Medio | Modelo de eventos y plantillas |
| P1 | Homologación y documentos de proveedor | SRM | Alto | Medio | Flujo de aprobación y almacenamiento |
| P1 | Scorecard básico de proveedores | SRM | Medio | Medio | Datos de entregas/incidentes |
| P1 | Tablero de despacho y conflictos | TMS | Alto | Alto | Datos completos de recursos y paradas |
| P1 | Paradas, ventanas y tiempos planificados/reales | TMS | Alto | Alto | Evolución del modelo de rutas |
| P1 | Prueba de servicio | TMS/Ticketing | Alto | Medio | Adjuntos, firma y política de ubicación |
| P2 | Base de conocimiento y sugerencias | Ticketing | Medio | Medio | Taxonomía estable |
| P2 | Cotizaciones, comparación y órdenes | SRM | Alto | Alto | Proveedores homologados y aprobaciones |
| P2 | PWA con borradores y sincronización | Transversal | Alto | Alto | Estrategia de conflictos y pruebas de campo |
| P2 | Optimización sugerida de secuencia | TMS | Alto | Alto | Coordenadas y tiempos confiables |
| P2 | Mantenimiento preventivo de flota | TMS | Medio | Alto | Odómetro y planes configurables |
| P3 | Portal de proveedores | SRM | Medio | Alto | Procesos SRM internos estabilizados |
| P3 | Optimización multiobjetivo y ETA dinámica | TMS | Alto | Muy alto | Históricos, motor de ruteo y telemetría |
| P3 | Clasificación o respuestas asistidas por IA | Transversal | Medio | Alto | Datos etiquetados, evaluación y controles |

## 11. Hoja de ruta sugerida

### Etapa 1 — Control y productividad operativa

- Introducir router y URLs profundas.
- Crear modelo común de eventos y línea de tiempo.
- Agregar notas internas, comentarios, seguidores y menciones.
- Implementar colas, filtros, vistas guardadas y búsqueda global.
- Automatizar alertas de SLA y crear centro de notificaciones.
- Fortalecer observabilidad, tareas programadas y pruebas de autorización.

**Resultado esperado:** menos seguimiento manual, menor riesgo de tickets olvidados y mejor trazabilidad.

### Etapa 2 — Relación de servicio y proveedores

- Normalizar contactos y construir vista 360°.
- Incorporar activos instalados y contratos de servicio.
- Mejorar encuestas y recuperación de clientes insatisfechos.
- Homologar proveedores, controlar documentos y evaluarlos.
- Definir taxonomía de casos y comenzar base de conocimiento.

**Resultado esperado:** servicio contextual, compromisos comerciales claros y proveedores medibles.

### Etapa 3 — Despacho y ejecución de campo

- Evolucionar rutas a paradas, ventanas, capacidades y tiempos.
- Crear tablero de despacho y validación de conflictos.
- Añadir check-in/check-out, ETA, excepciones y prueba de servicio.
- Consolidar costos por solicitud/ruta/cliente.
- Implementar PWA y sincronización gradual.

**Resultado esperado:** mayor puntualidad, utilización y confiabilidad de la evidencia de campo.

### Etapa 4 — Optimización e integración empresarial

- Cotizaciones, órdenes y recepción o integración con ERP.
- Portal de proveedores.
- Optimización de rutas basada en datos históricos confiables.
- Mantenimiento preventivo avanzado y telemetría opcional.
- Analítica predictiva y asistencia por IA bajo evaluación controlada.

**Resultado esperado:** reducción sistemática de costos, anticipación de riesgos y colaboración externa escalable.

## 12. Impacto técnico preliminar

### Nuevas entidades probables

- `solicitud_eventos`, `solicitud_comentarios`, `solicitud_seguidores`, `solicitud_relaciones`;
- `colas`, `vistas_guardadas`, `reglas_automatizacion`, `tareas_programadas`;
- `contactos`, `interacciones_cliente`, `activos_cliente`, `contratos_servicio`, `coberturas`;
- `proveedor_documentos`, `proveedor_evaluaciones`, `cotizaciones`, `ordenes`, `recepciones`;
- `ruta_paradas`, `ruta_eventos`, `pruebas_servicio`, `planes_mantenimiento`;
- `notificaciones_in_app`, `preferencias_notificacion`, `webhooks` e `intentos_integracion`.

Los nombres son orientativos. Antes de migrar se debe revisar si alguna capacidad puede extender tablas vigentes sin duplicar conceptos.

### Servicios de plataforma

- Procesador de trabajos programados y cola de reintentos.
- Búsqueda en PostgreSQL inicialmente; motor dedicado solo si el volumen lo exige.
- Edge Functions para recepción de correo, webhooks e integraciones externas.
- Realtime para notificaciones y despacho, sin usarlo como sustituto de persistencia.
- Almacenamiento con políticas diferenciadas para evidencias, contratos y documentos sensibles.

### Seguridad

Cada portal externo amplía la superficie de acceso. Será necesario diseñar RLS por organización y relación explícita, separar comentarios públicos/internos, usar enlaces firmados para archivos privados, proteger webhooks, limitar abuso, y auditar exportaciones y cambios de información bancaria o contractual.

## 13. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Construir demasiados módulos simultáneamente | Entregas verticales pequeñas con indicador de éxito por etapa |
| Duplicar funciones de un ERP | Definir límites e integrar órdenes/contabilidad cuando corresponda |
| Automatizaciones difíciles de entender | Simulación, explicación, auditoría y anulación manual justificada |
| Mala calidad de direcciones y tiempos | Tablero de calidad y validación antes de optimizar rutas |
| Exceso de notificaciones | Preferencias, agrupación, horarios y escalamiento gradual |
| Exposición de datos entre clientes/proveedores | Pruebas automatizadas de RLS y revisión de permisos por entidad |
| Seguimiento de ubicación invasivo | Consentimiento, mínima frecuencia necesaria y retención limitada |
| PWA con conflictos o pérdida de evidencia | Borradores, estados de sincronización, idempotencia y pruebas de desconexión |
| Indicadores inconsistentes | Diccionario de métricas y cálculo centralizado en base de datos |
| IA sin evidencia suficiente | Mantener decisiones humanas, medir precisión y no automatizar acciones sensibles al inicio |

## 14. Criterios para decidir el siguiente incremento

Antes de iniciar cada mejora se recomienda responder:

1. ¿Qué problema operativo medible resuelve?
2. ¿Quién es responsable del proceso y del dato?
3. ¿Puede resolverse configurando o extendiendo una capacidad existente?
4. ¿Qué permisos y reglas RLS necesita?
5. ¿Qué evento inicia el flujo y cuál es su estado terminal?
6. ¿Cómo se recupera de errores, duplicados o reintentos?
7. ¿Qué indicador demostrará adopción y beneficio?
8. ¿Qué datos personales, financieros o de ubicación incorpora?

## 15. Recomendación final

La evolución con mejor relación valor/riesgo es consolidar primero un **núcleo de gestión de servicio**: expediente unificado, colaboración, colas, SLA automático, búsqueda, notificaciones y vista 360° del cliente. Sobre ese núcleo deben construirse los acuerdos de servicio y los activos del cliente, luego la homologación de proveedores y el despacho avanzado.

La optimización TMS, el portal SRM y la inteligencia artificial tienen potencial alto, pero dependen de procesos estables y datos históricos completos. Implementarlos antes de resolver trazabilidad, calidad de datos y automatización básica produciría recomendaciones poco confiables y mayor carga operativa.
