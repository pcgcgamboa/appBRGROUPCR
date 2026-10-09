-- Bucket de Storage para archivos adjuntados al vuelo desde la computadora al enviar un WhatsApp
-- (distinto de clientes-documentos, que es el expediente formal del cliente) — mismo patrón de
-- bucket privado + políticas por es_gestor() que 20260821190000_documentos_clientes.sql. No lleva
-- tabla de metadatos propia: el registro de lo enviado ya queda en whatsapp_envios
-- (documento_nombre, documento_ruta_storage), y el archivo en sí no necesita administrarse aparte.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'whatsapp-adjuntos',
  'whatsapp-adjuntos',
  false,
  10485760,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy storage_whatsapp_adjuntos_lectura on storage.objects for select to authenticated
using (bucket_id = 'whatsapp-adjuntos' and public.es_gestor());

create policy storage_whatsapp_adjuntos_crear on storage.objects for insert to authenticated
with check (bucket_id = 'whatsapp-adjuntos' and owner_id = auth.uid()::text and public.es_gestor());

create policy storage_whatsapp_adjuntos_eliminar on storage.objects for delete to authenticated
using (bucket_id = 'whatsapp-adjuntos' and public.es_gestor());
