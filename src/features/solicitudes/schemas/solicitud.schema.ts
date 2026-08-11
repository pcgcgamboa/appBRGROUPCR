import { z } from 'zod'

export const solicitudSchema = z.object({
  nombre: z.string().trim().min(3, 'Ingrese un nombre descriptivo.'),
  tipo_solicitud_id: z.string().uuid('Seleccione un tipo de solicitud.'),
  ubicacion_id: z.string().uuid('Seleccione una ubicación.'),
  detalle: z.string().trim().min(10, 'Detalle la necesidad en al menos 10 caracteres.'),
})

export type SolicitudFormData = z.infer<typeof solicitudSchema>
