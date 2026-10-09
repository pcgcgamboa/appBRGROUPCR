import { z } from 'zod'

export const loginSchema = z.object({
  cuenta: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9][a-z0-9._-]{2,49}$/, 'Ingrese una cuenta válida.'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres.'),
})

export type LoginFormData = z.infer<typeof loginSchema>
