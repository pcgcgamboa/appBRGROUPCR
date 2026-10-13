-- Nuevo estado "enviada" entre "creada" y "asignada". Va solo en esta migración: PostgreSQL no
-- permite usar un valor de enum recién agregado dentro de la misma transacción, y la migración
-- siguiente (20261013120100_flujo_solicitud_enviada.sql) ya lo usa.
alter type public.estado_solicitud add value if not exists 'enviada' after 'creada';
