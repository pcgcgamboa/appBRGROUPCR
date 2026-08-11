import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/atoms/button'
import { FormField } from '@/components/molecules/form-field'
import { loginSchema, type LoginFormData } from '@/features/auth/schemas/login.schema'
import { supabase } from '@/lib/supabase'
import { useI18n } from '@/lib/i18n'

export function LoginForm() {
  const { t } = useI18n()
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
    if (error) setErrorServidor(t('invalidCredentials'))
  }

  return (
    <form
      onSubmit={handleSubmit(iniciarSesion)}
      className="grid gap-5 rounded-lg border bg-white p-6 shadow-sm"
    >
      <div>
        <h2 className="text-xl font-semibold">{t('signIn')}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t('loginHelp')}</p>
      </div>
      <FormField
        id="email"
        label={t('email')}
        type="email"
        autoComplete="email"
        error={errors.email?.message}
        {...register('email')}
      />
      <FormField
        id="password"
        label={t('password')}
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
        {isSubmitting ? t('signingIn') : t('enter')}
      </Button>
    </form>
  )
}
