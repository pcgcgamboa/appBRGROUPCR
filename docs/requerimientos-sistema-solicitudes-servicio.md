# Especificación de Requerimientos — Sistema de Solicitudes de Servicio

> **Estado de esta referencia:** actualizado el 20 de agosto de 2026 contra la implementación vigente (código, migraciones de `supabase/migrations` y `DESIGN.md`). Ante una discrepancia, el código es la fuente de verdad; este documento describe el comportamiento funcional esperado. Los documentos `docs/fase-2-*.md` … `docs/fase-7-*.md` conservan el detalle histórico de cada entrega y ya no reflejan por sí solos el alcance actual — en particular, el control de ruta por solicitud descrito en `fase-4-control-ruta.md` fue reemplazado por el modelo de **rutas de proceso** (sección 3.7). Este documento es la referencia funcional vigente; para el detalle de datos y RLS ver `docs/modelo-datos-fase-1.md` y las migraciones.

## 1. Descripción general

Sistema web responsive que permite a un usuario registrado crear solicitudes de servicio (mantenimiento, soporte, reparación, instalación), gestionadas por un Encargado de Proceso, atendidas por uno o varios Operadores/Técnicos en campo, con planificación de rutas agrupadas, control de flota (vehículos, combustible, kilometraje, gastos y depreciación), registro de materiales, avance y cierre validado por el cliente. Incluye además un portal público de postulación de técnicos independientes (bolsa de empleo), catálogos de proveedores, y parametrización de marca (logo/ícono) para instancias del sistema con identidad propia.

## 2. Roles

| Rol | Descripción |
|---|---|
| **Administrador** | Ve todo el sistema, gestiona todos los catálogos (clientes, tipos de servicio, materiales, vehículos, técnicos, proveedores, usuarios/roles, marca) y puede intervenir en solicitudes activas (reasignar, cerrar, cancelar) igual que el Encargado. Es el único rol que resuelve postulaciones de la bolsa de empleo y gestiona gastos/indisponibilidad de flota. |
| **Encargado de Proceso** | Revisa solicitudes entrantes, asigna prioridad, asigna/reasigna Operador, planifica rutas de proceso (agrupa solicitudes, vehículos y responsable), controla notificaciones al cliente, puede editar los datos generales de una solicitud activa. |
| **Operador de Servicio** | Atiende la solicitud asignada: registra materiales, horas trabajadas, porcentaje de avance, bitácora narrativa, adjuntos, y estado, desde web o móvil (responsive). Puede asignar técnicos de apoyo a sus solicitudes y registrar movimientos de vehículo (combustible, kilometraje) en rutas donde participa.
| **Cliente** | Accede en modalidad de autogestión para indicar satisfacción o comentarios sobre la atención recibida. |
| **Usuario solicitante** | Crea la solicitud de servicio inicial. |

- Un mismo usuario puede tener **más de un rol** simultáneamente; `SessionToolbar` permite alternar el rol activo durante la sesión.
- Los **técnicos** (albañil, soldador, chofer) no son usuarios del sistema: son un catálogo de personal de apoyo asignable a solicitudes, alimentado manualmente por el Administrador o mediante aprobación de postulaciones públicas (sección 3.11).

## 3. Entidades principales

### 3.1 Solicitud de Servicio
- Número correlativo, nombre, detalle
- Tipo (mantenimiento, soporte, reparación, instalación)
- Cliente (relación a catálogo de Clientes) y ubicación (Provincia, Cantón, Distrito, Otras señas)
- Prioridad (definida por el Encargado al revisar la solicitud, no por el solicitante)
- Estado (ver sección 4)
- SLA calculado según tipo + prioridad, con fecha límite derivada de la fecha de creación
- Adjuntos (fotos/documentos) permitidos desde la creación: JPEG, PNG, WebP o PDF, máximo 10 MB por archivo
- Técnicos de apoyo asignados (catálogo de técnicos, sección 3.5), gestionable por el Encargado/Administrador o por el Operador asignado
- Materiales asociados: registrados por el Operador junto a un avance, o directamente por un Administrador/Encargado sin necesidad de un avance
- **Edición de datos generales**: el Administrador o Encargado puede corregir nombre, detalle, cliente, ubicación, tipo y prioridad mientras la solicitud no esté cerrada, cancelada o rechazada; cada edición recalcula el SLA si cambia el tipo/prioridad y queda registrada en una auditoría con el estado anterior y el nuevo, el usuario y la fecha

### 3.2 Cliente (catálogo)
- Razón social / nombre, identificación, contactos
- Ubicaciones asociadas (con coordenadas opcionales para mapas)

### 3.3 Catálogo de Materiales
- Nombre / descripción, unidad de medida, costo referencial
- Los materiales nuevos agregados libremente por el Operador **se incorporan automáticamente** al catálogo general
- Cada línea de material queda con el costo referencial vigente al momento del registro, para permitir reportes de costo histórico aunque el catálogo cambie después

### 3.4 Catálogo de Vehículos
- Placa, capacidad, tipo, estado general (Disponible / En uso / Mantenimiento)
- Datos financieros: costo inicial, fecha de adquisición, vida útil en meses, valor residual (usados para calcular depreciación acumulada en los reportes de flota)
- Kilometraje actual (odómetro), con validación de que nunca retrocede, e historial de lecturas
- Galería de fotos del vehículo (JPEG/PNG/WebP, máx. 10 MB), gestionada por el Administrador
- Períodos de indisponibilidad (mantenimiento u otra razón, con rango de fechas), registrados por el Administrador
- Gastos del vehículo por tipo (mantenimiento, cambio de aceite, reparación, seguro, depreciación, otro), con monto, fecha y comprobante opcional

### 3.5 Catálogo de Técnicos
- Nombre completo, identificación, especialidad (albañil, soldador, chofer), celular, correo opcional, dirección, contacto de emergencia, observaciones, estado activo/inactivo
- Alimentado directamente por el Administrador o mediante aprobación de una postulación de la bolsa de empleo
- Asignable a una o varias solicitudes como apoyo al Operador principal

### 3.6 Catálogo de Proveedores
- Nombre, identificación, persona de contacto, teléfono, celular, correo
- Artículos o servicios que provee (texto libre)
- Ubicación (Provincia, Cantón, Distrito, dirección)
- Gestionado únicamente por el Administrador; es un directorio de referencia para abastecimiento, sin relación estructural directa con solicitudes o materiales

### 3.7 Ruta de Proceso
Reemplaza el modelo original de "una ruta por solicitud"; una ruta de proceso agrupa la operación de campo de un día o recorrido:
- Código y nombre de la ruta, descripción, fecha programada
- Estado: Planificada / En curso / Finalizada / Cancelada
- Responsable (un Operador o Encargado activo)
- Una o varias **solicitudes** incluidas, con orden de atención (una solicitud pertenece como máximo a una ruta de proceso)
- Uno o varios **vehículos** asociados, con un vehículo marcado como principal
- **Movimientos de vehículo** durante la ruta: combustible, kilometraje, lavado u otro, con cantidad/unidad, monto y detalle — registrables por el responsable de la ruta, por el Operador de una solicitud incluida, o por Administrador/Encargado
- Toda la operación de guardado (crear/editar ruta, solicitudes y vehículos asociados) ocurre en una única transacción con validación de rol, de solicitudes y de disponibilidad de vehículos

### 3.8 Avance / Bitácora
Por cada actualización del Operador sobre una solicitud se registra:
- Horas trabajadas (0–24)
- Porcentaje de avance (0–100%, monotónico: nunca menor a un avance anterior; una solicitud marcada "atendida" exige 100%)
- Narrativa de la visita/sesión
- Vehículo utilizado, heredado obligatoriamente de la ruta de proceso a la que pertenece la solicitud
- Materiales existentes o ingresados como texto libre
- Adjuntos (fotos/documentos)

Toda la operación (avance, materiales, vehículo, adjuntos y cambio de estado) se guarda en una única transacción; si falla, no queda información parcial y el frontend retira los archivos ya subidos al bucket.

### 3.9 Notificaciones
- Dirigidas al Cliente por correo (SMTP propio vía Edge Function)
- Controladas por el Administrador o Encargado de Proceso
- Activables **individualmente por cada cambio de estado** de una solicitud (asignada, en atención, en espera de materiales, atendida, cerrada, cancelada, rechazada)
- Cada intento de envío queda auditado (`pendiente` / `enviado` / `error`); un fallo de envío no revierte el cambio de estado de la solicitud

### 3.10 Configuración de marca
- Logo e ícono de la aplicación, editables por el Administrador y almacenados en un bucket público
- Se aplican dinámicamente en el header, favicon y panel del login, permitiendo reutilizar el sistema bajo distintas identidades visuales sin cambios de código

### 3.11 Bolsa de empleo / Postulaciones de técnicos
- Página pública (`/bolsa-empleo`, sin autenticación) donde una persona puede postularse como técnico independiente indicando datos personales, especialidad, ubicación, experiencia y disponibilidad
- Cada postulación queda en estado Pendiente / Aprobada / Rechazada
- El Administrador revisa las postulaciones pendientes; al aprobar una, se crea automáticamente el registro correspondiente en el catálogo de Técnicos (sección 3.5) con los datos de la postulación; al rechazar, puede dejar un comentario de revisión
- No puede existir más de una postulación pendiente con la misma identificación

## 4. Flujo de estados de la Solicitud

```
Creada → Asignada → En atención → En espera de materiales → Atendida → Cerrada
```
Estados adicionales:
- **Cancelada / Rechazada**: el Encargado puede rechazar antes de asignar.
- **Reapertura**: una solicitud Cerrada puede reabrirse sin límite de tiempo.

Reglas asociadas:
- Asignación: un solo Operador principal por solicitud (los técnicos de apoyo, sección 3.5, no reemplazan esta asignación).
- Reasignación: permitida, solo la ejecuta el Encargado de Proceso o el Administrador.
- Cierre: requiere que el Cliente, en autogestión, indique satisfacción de la atención o comentarios al respecto; el comentario es obligatorio si indica que no está satisfecho. PostgreSQL vuelve a comprobar la validación antes de permitir el cierre, incluso si la interfaz lo omitiera.
- Materiales: registro informativo, sin aprobación previa requerida.
- El Operador no puede cancelar, rechazar, cerrar ni reabrir solicitudes; solo transiciona dentro del flujo de atención.

## 5. Reglas de negocio — SLA y Prioridad

- Prioridad: la define el Encargado de Proceso al revisar la solicitud (no el solicitante); puede permanecer vacía mientras la solicitud esté en estado `creada`.
- SLA por combinación tipo + prioridad, configurable por el Administrador (matriz inicial: Baja 120 h, Media 72 h, Alta 48 h, Urgente 24 h). Las solicitudes urgentes nunca superan 24 horas, sin importar la configuración del tipo.
- La fecha límite del SLA se calcula desde la creación original de la solicitud, no desde su asignación, y se recalcula si la edición de datos generales cambia el tipo o la prioridad.
- Vencimiento de SLA: se marca **visualmente** en el sistema (no dispara notificación automática).
- Un mismo Cliente/ubicación puede tener múltiples solicitudes activas simultáneas sin restricción.

## 6. Reportes / Dashboards

Disponibles para Administrador y Encargado, con indicadores calculados en PostgreSQL en una sola consulta por reporte:

- **Panorama de solicitudes**: total, activas, urgentes y con SLA vencido; distribución por estado, por prioridad (incluida la categoría sin definir) y por urgencia (finalizadas, vencidas, dentro de plazo).
- **Costos de materiales**: costo total y desglose por solicitud, por ruta de proceso y por responsable de ruta, usando el costo referencial aplicado en cada línea de material.
- **Flota**: total de rutas, kilómetros recorridos, gasto operativo (movimientos de ruta) y gasto de flota (mantenimiento/seguro/etc.); detalle por ruta y por vehículo, incluida la depreciación acumulada calculada a partir de costo inicial, valor residual y vida útil.

## 7. Requerimientos no funcionales

- **Plataforma:** Web responsive única, cubre Administrador, Encargado, Cliente y Operador en campo, más un portal público de postulación (sin app nativa por ahora; se evalúa a futuro).
- **Idioma:** interfaz con soporte multiidioma (español/inglés) mediante `useI18n`; no deben incorporarse cadenas visibles hardcodeadas cuando exista o deba existir una clave de traducción.
- **Adjuntos desde móvil:** captura de fotos vía input nativo del navegador (HTML5 `capture`).
- **Arquitectura frontend:** Atomic Design (atoms, molecules, organisms, templates, pages) sobre estructura feature-first; sin router de cliente — la navegación por rol vive en estado local (ver límite conocido en `DESIGN.md`).
- **Accesibilidad:** WCAG 2.1 AA verificado en tokens de color (ver `DESIGN.md`); objetivo táctil mínimo de 44 px, `prefers-reduced-motion` respetado, estados de error asociados por `aria-describedby`.
- **Modelo de datos / backend:** Supabase como BaaS completo — Postgres + Auth + Storage + Realtime, con reglas de acceso mediante Row Level Security (RLS) y lógica de negocio transaccional en funciones PostgreSQL y Edge Functions (sin backend .NET intermedio).
- **Licenciamiento:** stack 100% open source / sin costo de licencias (ver stack tecnológico).

## 8. Stack tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| Arquitectura UI | Atomic Design + feature-first |
| Estilos | Tailwind CSS + primitivos locales estilo shadcn/ui (Radix UI) |
| Estado servidor | TanStack Query (vía Supabase client) |
| Estado global | Zustand |
| Formularios | React Hook Form + Zod |
| Mapas | Leaflet + React Leaflet + OpenStreetMap |
| Gráficas / Dashboards | Recharts |
| Backend / BaaS | **Supabase** (Postgres, Auth, Storage, Realtime, Edge Functions) |
| Autorización | Row Level Security (RLS) por rol en Supabase |
| Lógica de negocio (SLA, cierre, rutas, avances, notificaciones, reportes) | Funciones PostgreSQL `security definer`/`invoker` y Edge Functions (Deno) |
| Notificaciones por correo | Edge Function + `nodemailer` sobre SMTP propio |
| Control de versiones | Git + GitHub |
| CI/CD | GitHub Actions |
| Hosting frontend | Vercel / Netlify (capa gratuita) o servidor propio |

## 9. Seguridad y autorización

- Autenticación y sesión mediante Supabase Auth; `usuarios` extiende `auth.users` con el mismo UUID.
- Autorización multirrol mediante `roles` y `usuario_roles`; ningún usuario puede autoasignarse roles.
- RLS activo en todas las tablas de negocio; las políticas usan funciones `security definer` pequeñas (`tiene_rol`, `es_gestor`, `puede_ver_solicitud`) para evitar recursión.
- Operaciones sensibles (gestión de usuarios, cambios de estado, control de ruta, avances, cierre, edición de datos, resolución de postulaciones) pasan por Edge Functions o funciones PostgreSQL que validan el rol antes de ejecutar, y en su mayoría corren con el JWT del usuario real para que RLS y las auditorías conserven la identidad de quien actúa.
- La clave `service_role` nunca se expone en variables `VITE_*` ni se envía al navegador; solo la usa la Edge Function `admin-users` dentro del entorno administrado.

## 10. Estado de implementación

Todas las fases documentadas en `docs/fase-2-*.md` a `docs/fase-7-*.md` están implementadas, junto con extensiones posteriores no documentadas por fase: catálogo de técnicos y proveedores, bolsa de empleo pública, rutas de proceso agrupadas (con movimientos, indisponibilidad y gastos de flota), datos financieros y fotográficos de vehículos, edición auditada de datos generales de la solicitud, asociación directa de materiales por administradores/encargados, reporte de costos de materiales, reporte de flota, y configuración de marca.

### Puntos abiertos / a validar en fases posteriores

- Consolidar la documentación por fase (`docs/fase-4-control-ruta.md` describe el modelo de ruta 1:1 ya reemplazado) en referencias vigentes o retirarlas para evitar confusión.
- Definir si el modelo original de "control de ruta por solicitud" (`route-control-form.tsx`, tabla `rutas`) se retira formalmente del código — actualmente no tiene ningún punto de entrada en la interfaz.
- Evaluar la introducción de un router de cliente para permitir URLs profundas compartibles (deuda conocida registrada en `DESIGN.md`).
- Adopción total de tokens semánticos y del primitivo `Card`/`Table` compartido en las vistas restantes (deuda conocida registrada en `DESIGN.md`).
