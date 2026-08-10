# Especificación de Requerimientos — Sistema de Solicitudes de Servicio

## 1. Descripción general

Sistema web responsive que permite a un usuario registrado crear solicitudes de servicio (mantenimiento, soporte, reparación, instalación), las cuales son gestionadas por un Encargado de Proceso, atendidas por un Operador de Servicio en campo, con control de ruta (operarios, vehículo, ubicación), registro de materiales, avance y cierre validado por el cliente.

## 2. Roles

| Rol | Descripción |
|---|---|
| **Administrador** | Ve todo el sistema, gestiona catálogos (clientes, tipos de servicio, materiales, vehículos, usuarios/roles) y puede intervenir en solicitudes activas (reasignar, cerrar, cancelar) igual que el Encargado. |
| **Encargado de Proceso** | Revisa solicitudes entrantes, asigna prioridad, asigna/reasigna Operador, define control de ruta, aprueba/gestiona el flujo de la solicitud, controla notificaciones al cliente. |
| **Operador de Servicio** | Atiende la solicitud asignada: registra materiales, horas trabajadas, porcentaje de avance, bitácora narrativa, adjuntos, y estado, desde web o móvil (responsive). |
| **Cliente** | Accede en modalidad de autogestión para indicar satisfacción o comentarios sobre la atención recibida. |
| **Usuario solicitante** | Crea la solicitud de servicio inicial. |

- Un mismo usuario puede tener **más de un rol** simultáneamente.

## 3. Entidades principales

### 3.1 Solicitud de Servicio
- Nombre
- Tipo (mantenimiento, soporte, reparación, instalación)
- Detalle de la solicitud
- Cliente (relación a catálogo de Clientes)
- Ubicación (Provincia, Cantón, Distrito, Otras señas)
- Prioridad (definida por el Encargado al revisar la solicitud, no por el solicitante)
- Estado (ver sección 4)
- SLA calculado según tipo + prioridad
- Adjuntos (fotos/documentos) permitidos desde la creación

### 3.2 Cliente (catálogo)
- Razón social / nombre
- Contactos
- Ubicaciones asociadas

### 3.3 Catálogo de Materiales
- Nombre / descripción
- Unidad de medida
- Costo referencial
- Los materiales nuevos agregados libremente por el Operador **se incorporan automáticamente** al catálogo general.

### 3.4 Catálogo de Vehículos
- Placa
- Capacidad
- Tipo
- Estado (Disponible / En uso / Mantenimiento)

### 3.5 Control de Ruta
- Relación **1 a 1** con la Solicitud (no agrupa múltiples solicitudes)
- Operarios asignados
- Vehículo asignado (desde catálogo)
- Ubicación (definida por el Encargado: Provincia, Cantón, Distrito, Otras señas)
- Estado independiente por elemento:
  - Operario: Disponible / En ruta / Ocupado
  - Vehículo: Disponible / En uso / Mantenimiento
  - Ubicación (checkpoint): Pendiente / En tránsito / Llegó
- Sin orden/secuencia de paradas (asignación simple)
- El dato de vehículo se incorpora también en el registro de Atención a la Solicitud

### 3.6 Avance / Bitácora
Por cada actualización del Operador se registra:
- Horas trabajadas
- Porcentaje de avance (0–100%)
- Narrativa de la visita/sesión
- Adjuntos (fotos/documentos)

### 3.7 Notificaciones
- Dirigidas al Cliente
- Controladas por el Encargado de Proceso
- Activables **individualmente por cada cambio de estado** (no es una decisión global por solicitud)

## 4. Flujo de estados de la Solicitud

```
Creada → Asignada → En atención → En espera de materiales → Atendida → Cerrada
```
Estados adicionales:
- **Cancelada / Rechazada**: el Encargado puede rechazar antes de asignar.
- **Reapertura**: una solicitud Cerrada puede reabrirse sin límite de tiempo.

Reglas asociadas:
- Asignación: un solo Operador por solicitud.
- Reasignación: permitida, solo la ejecuta el Encargado de Proceso.
- Cierre: requiere que el Cliente, en autogestión, indique satisfacción de la atención o comentarios al respecto.
- Materiales: registro informativo, sin aprobación previa requerida.

## 5. Reglas de negocio — SLA y Prioridad

- Prioridad: la define el Encargado de Proceso al revisar la solicitud (no el solicitante).
- SLA por combinación tipo + prioridad:
  - Solicitudes **urgentes**: deben atenderse dentro de las siguientes **24 horas**.
  - Solicitudes de **prioridad alta**: se muestran entre las primeras en los listados del sistema.
- Vencimiento de SLA: se marca **visualmente** en el sistema (no dispara notificación automática).
- Un mismo Cliente/ubicación puede tener múltiples solicitudes activas simultáneas sin restricción.

## 6. Reportes / Dashboards

- Solicitudes por estado
- Solicitudes por prioridad
- Solicitudes por urgencia

## 7. Requerimientos no funcionales

- **Plataforma:** Web responsive única, cubre Administrador, Encargado, Cliente y Operador en campo (sin app nativa por ahora; se evalúa a futuro).
- **Adjuntos desde móvil:** captura de fotos vía input nativo del navegador (HTML5 `capture`).
- **Arquitectura frontend:** Atomic Design (atoms, molecules, organisms, templates, pages) sobre estructura feature-first.
- **Modelo de datos / backend:** Supabase como BaaS completo — Postgres + Auth + Storage + Realtime, con reglas de acceso mediante Row Level Security (RLS) y lógica de negocio en Edge Functions (sin backend .NET intermedio).
- **Licenciamiento:** stack 100% open source / sin costo de licencias (ver stack tecnológico).

## 8. Stack tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| Arquitectura UI | Atomic Design + feature-first |
| Estilos | Tailwind CSS + shadcn/ui (Radix UI) |
| Estado servidor | TanStack Query (vía Supabase client) |
| Estado global | Zustand |
| Formularios | React Hook Form + Zod |
| Mapas / Control de Ruta | Leaflet + OpenStreetMap |
| Gráficas / Dashboards | Recharts |
| Backend / BaaS | **Supabase** (Postgres, Auth, Storage, Realtime, Edge Functions) |
| Autorización | Row Level Security (RLS) por rol en Supabase |
| Lógica de negocio (SLA, cierre, notificaciones) | Supabase Edge Functions (Deno) |
| Notificaciones por correo | Supabase Edge Functions + SMTP propio (o proveedor con capa gratuita) |
| Control de versiones | Git + GitHub |
| CI/CD | GitHub Actions |
| Hosting frontend | Vercel / Netlify (capa gratuita) o servidor propio |

## 9. Puntos abiertos / a validar en fases posteriores

- Modelo entidad-relación detallado (tablas, claves foráneas, políticas RLS por tabla).
- Definición exacta de políticas de Row Level Security por rol.
- Estrategia de versionado de esquema de base de datos (Supabase migrations).
- Diseño de las Edge Functions necesarias (cálculo de SLA, validación de cierre, envío de notificaciones).
