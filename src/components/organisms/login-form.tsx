import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff, LoaderCircle, LockKeyhole } from 'lucide-react'
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
  const [mostrarPassword, setMostrarPassword] = useState(false)
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
    <form onSubmit={handleSubmit(iniciarSesion)} className="grid gap-5">
      <div>
        <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <LockKeyhole className="size-6" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{t('welcomeBack')}</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{t('loginPrompt')}</p>
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
        type={mostrarPassword ? 'text' : 'password'}
        autoComplete="current-password"
        error={errors.password?.message}
        endAdornment={
          <button
            type="button"
            className="flex size-9 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label={mostrarPassword ? t('hidePassword') : t('showPassword')}
            onClick={() => setMostrarPassword((actual) => !actual)}
          >
            {mostrarPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        }
        {...register('password')}
      />
      {errorServidor && (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
        >
          {errorServidor}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting && <LoaderCircle className="mr-2 size-4 animate-spin" />}
        {isSubmitting ? t('signingIn') : t('enter')}
      </Button>
      <p className="text-center text-xs leading-5 text-muted-foreground">{t('protectedAccess')}</p>
    </form>
  )
}
