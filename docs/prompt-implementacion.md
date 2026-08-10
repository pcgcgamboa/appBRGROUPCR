# Prompt de Implementación — Sistema de Solicitudes de Servicio

> Uso previsto: pegar este prompt en Claude Code (u otra herramienta agéntica de desarrollo) para iniciar la implementación por fases. El archivo `requerimientos-sistema-solicitudes-servicio.md` debe estar disponible en el repositorio como referencia (`docs/requerimientos.md`).

---

## Rol

Actúa como arquitecto y desarrollador senior full-stack, especializado en React + TypeScript + Supabase, con dominio de Atomic Design y Row Level Security (RLS) en PostgreSQL.

## Contexto del proyecto

Vas a construir un sistema web responsive de gestión de solicitudes de servicio (mantenimiento, soporte, reparación, instalación) con control de ruta, materiales, avance y cierre validado por el cliente. La especificación funcional completa está en `docs/requerimientos.md` — léela antes de generar cualquier código y consúltala ante cualquier duda de alcance.

## Stack obligatorio

- **Frontend:** React 18 + TypeScript + Vite
- **Arquitectura de componentes:** Atomic Design (`atoms/`, `molecules/`, `organisms/`, `templates/`, `pages/`) combinado con organización feature-first para lógica de negocio (hooks, queries, tipos por feature)
- **Estilos:** Tailwind CSS + shadcn/ui
- **Estado de servidor:** TanStack Query sobre el cliente de Supabase
- **Estado global de UI:** Zustand
- **Formularios/validación:** React Hook Form + Zod
- **Mapas:** Leaflet + OpenStreetMap
- **Gráficas:** Recharts
- **Backend:** Supabase como BaaS completo — **sin backend .NET intermedio**. Toda la lógica de negocio compleja (cálculo de SLA, validación de cierre, disparo de notificaciones) va en Supabase Edge Functions (Deno/TypeScript). El control de acceso por rol se implementa con Row Level Security (RLS) en PostgreSQL.

## Restricciones no negociables

1. No introducir dependencias con licencia propietaria o con costo obligatorio de licenciamiento.
2. No crear un backend .NET ni ninguna API intermedia entre el frontend y Supabase, salvo Edge Functions.
3. Todo componente visual debe clasificarse explícitamente dentro de la jerarquía Atomic Design; no se aceptan componentes "sueltos" fuera de esa estructura.
4. El acceso a datos por rol (Administrador, Encargado de Proceso, Operador de Servicio, Cliente, Usuario solicitante) debe reforzarse con políticas RLS, no solo con lógica en el frontend.
5. Un usuario puede tener más de un rol simultáneamente — el modelo de autorización debe soportarlo desde el diseño de la base de datos.

## Fases de trabajo (ejecutar en orden, confirmando conmigo antes de pasar a la siguiente)

### Fase 0 — Setup del proyecto
- Inicializar repositorio con Vite + React + TypeScript.
- Configurar Tailwind CSS y shadcn/ui.
- Configurar cliente de Supabase (`@supabase/supabase-js`) y variables de entorno.
- Definir estructura de carpetas Atomic Design + feature-first.
- Configurar ESLint/Prettier y scripts de CI (GitHub Actions).

### Fase 1 — Modelo de datos y autenticación
- Proponer el esquema completo de tablas en Supabase (Postgres) a partir de `docs/requerimientos.md`, incluyendo: `usuarios`, `roles`, `usuario_roles`, `clientes`, `ubicaciones`, `tipos_solicitud`, `solicitudes`, `estados_solicitud` (o enum), `materiales`, `solicitud_materiales`, `vehiculos`, `rutas` (1 a 1 con solicitud), `ruta_operarios`, `avances` (bitácora), `adjuntos`, `notificaciones_config`.
- Escribir las migraciones SQL de Supabase.
- Definir políticas RLS por tabla y por rol.
- Configurar Supabase Auth (email/password como mínimo) y la relación usuario–roles.
- **Detente aquí y muéstrame el esquema propuesto antes de continuar.**

### Fase 2 — Catálogos y módulo Administrador
- CRUD de Clientes, Tipos de Solicitud, Materiales, Vehículos, Usuarios/Roles.
- Vista de Administrador con capacidad de intervenir en solicitudes activas.

### Fase 3 — Módulo Solicitudes (creación y flujo de estados)
- Formulario de creación de solicitud (Usuario solicitante).
- Bandeja del Encargado de Proceso: revisión, asignación de prioridad, asignación de Operador, rechazo.
- Máquina de estados: Creada → Asignada → En atención → En espera de materiales → Atendida → Cerrada, + Cancelada/Rechazada + Reapertura.
- Cálculo de SLA (Edge Function) y marca visual de vencimiento (urgente = 24h).

### Fase 4 — Control de Ruta
- Módulo para que el Encargado defina operarios, vehículo y ubicación (Provincia/Cantón/Distrito/Otras señas) por solicitud.
- Estados independientes de operario, vehículo y checkpoint de ubicación.
- Integración con Leaflet para visualización de la ubicación.

### Fase 5 — Módulo Operador (web responsive)
- Vista de atención de solicitud: registro de materiales (desde catálogo o texto libre, con alta automática al catálogo), horas trabajadas, porcentaje de avance, bitácora narrativa, adjuntos (fotos vía `capture` de HTML5).
- Debe funcionar correctamente en viewport móvil sin necesidad de app nativa.

### Fase 6 — Autogestión del Cliente y notificaciones
- Vista de Cliente para indicar satisfacción/comentarios como parte del cierre.
- Configuración de notificaciones por el Encargado, activables individualmente por cambio de estado (Edge Function + envío de correo).

### Fase 7 — Reportes y Dashboards
- Vistas con Recharts: solicitudes por estado, por prioridad, por urgencia.

## Formato de entrega esperado en cada fase

- Código completo y funcional, no fragmentos parciales.
- Explicación breve de las decisiones de modelado o arquitectura tomadas.
- Lista de migraciones/políticas RLS nuevas, si aplica.
- Indicar explícitamente qué quedó pendiente o qué supuestos se tomaron ante ambigüedad no cubierta en `docs/requerimientos.md`.

## Idioma

Todo el código (nombres de tablas, columnas, funciones) puede ir en español, consistente con el dominio del negocio (ej. `solicitudes`, `encargado_id`). Los comentarios y la documentación técnica también en español.
