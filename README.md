# Sistema de Solicitudes de Servicio

Aplicación web responsive para gestionar solicitudes, asignaciones, rutas, avances y cierres de servicio.

## Requisitos

- Node.js LTS
- npm
- Un proyecto de Supabase

## Inicio local

1. Copiar `.env.example` como `.env.local` y completar las credenciales públicas de Supabase.
2. Ejecutar `npm install`.
3. Ejecutar `npm run dev`.

## Organización

- `src/components`: jerarquía Atomic Design (`atoms`, `molecules`, `organisms`, `templates`, `pages`).
- `src/features`: lógica de negocio organizada por funcionalidad.
- `src/lib`: clientes y utilidades compartidas.
- `src/stores`: estado global de interfaz con Zustand.
- `supabase`: migraciones y Edge Functions, a partir de la Fase 1.

La especificación funcional se encuentra en `docs/requerimientos-sistema-solicitudes-servicio.md`.

## Supabase

- `supabase/config.toml`: configuración local de Auth, API, base de datos y Storage.
- `supabase/migrations`: esquema, datos iniciales, RLS y reglas de integridad.
- `docs/modelo-datos-fase-1.md`: decisiones y diagrama de relaciones.
- `docs/configuracion-supabase.md`: preparación del proyecto remoto y primer administrador.
- `docs/fase-3-solicitudes-sla.md`: creación, asignación, estados y cálculo de SLA.
- `docs/fase-4-control-ruta.md`: asignación de ruta, estados y mapa OpenStreetMap.
- `docs/fase-5-operador.md`: atención móvil, avances, materiales y adjuntos.
- `docs/fase-6-cliente-notificaciones.md`: validación de cierre y correo SMTP.
