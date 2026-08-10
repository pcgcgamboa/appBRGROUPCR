import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/atoms/button'
import { FormField } from '@/components/molecules/form-field'
import { loginSchema, type LoginFormData } from '@/features/auth/schemas/login.schema'
import { supabase } from '@/lib/supabase'

export function LoginForm() {
  const [errorServidor, setErrorServidor] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  async function iniciarSesion(values: LoginFormData) {
    if (!supabase) return
    setErrorServidor(null)
    const { error } = await supabase.auth.signInWithPassword(values)
    if (error) setErrorServidor('No fue posible iniciar sesión. Verifique sus credenciales.')
  }

  return (
    <form
      onSubmit={handleSubmit(iniciarSesion)}
      className="grid gap-5 rounded-lg border bg-white p-6 shadow-sm"
    >
      <div>
        <h2 className="text-xl font-semibold">Iniciar sesión</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Use su cuenta registrada en Supabase Auth.
        </p>
      </div>
      <FormField
        id="email"
        label="Correo electrónico"
        type="email"
        autoComplete="email"
        error={errors.email?.message}
        {...register('email')}
      />
      <FormField
        id="password"
        label="Contraseña"
        type="password"
        autoComplete="current-password"
        error={errors.password?.message}
        {...register('password')}
      />
      {errorServidor && (
        <p role="alert" className="text-sm text-red-700">
          {errorServidor}
        </p>
      )}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Ingresando…' : 'Ingresar'}
      </Button>
    </form>
  )
}
