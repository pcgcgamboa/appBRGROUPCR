-- Permite un tercer resultado 'preparado' en whatsapp_envios: el modo "clic para chatear" (wa.me)
-- abre WhatsApp con el mensaje/enlace ya escrito, pero el sistema no puede confirmar que la
-- persona efectivamente presionó Enviar — a diferencia de 'enviado', que sí confirma un envío real
-- vía el bridge de whatsapp-web.js (ver enviar-whatsapp/index.ts, modo 'directo' vs 'bridge').
alter table public.whatsapp_envios drop constraint whatsapp_envios_resultado_check;
alter table public.whatsapp_envios
  add constraint whatsapp_envios_resultado_check
  check (resultado in ('enviado', 'error', 'preparado'));
