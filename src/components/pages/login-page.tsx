import { LoginForm } from '@/components/organisms/login-form'
import { useMarca } from '@/features/configuracion/hooks/use-marca'
import { useI18n } from '@/lib/i18n'
import { BriefcaseBusiness } from 'lucide-react'
import { Button } from '@/components/atoms/button'

export function LoginPage() {
  const { t } = useI18n()
  const marca = useMarca()

  return (
    <section className="mx-auto grid min-h-[calc(100dvh-6.5rem)] max-w-6xl items-center gap-8 py-2 lg:grid-cols-[1.15fr_0.85fr] lg:gap-14">
      <div className="relative hidden h-[min(580px,calc(100dvh-7.5rem))] min-h-[510px] overflow-hidden rounded-[2rem] bg-gradient-to-br from-blue-950 via-blue-900 to-primary p-9 text-white shadow-2xl lg:block">
        <div className="absolute -right-24 -top-24 size-72 rounded-full bg-cyan-300/20 blur-3xl" />
        <div className="absolute -bottom-32 -left-20 size-80 rounded-full bg-blue-400/20 blur-3xl" />
        <div className="relative flex h-full flex-col justify-center">
          <div>
            <div className="mb-9 max-w-md rounded-2xl bg-card p-4 shadow-xl shadow-slate-950/20">
              <img
                src={marca.data?.logo_url}
                alt="BR Mantenimiento General"
                width={400}
                height={160}
                className="aspect-[5/2] w-full object-contain"
              />
            </div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-200">
              {t('loginEyebrow')}
            </p>
            <h1 className="mt-4 max-w-xl text-4xl font-bold leading-tight tracking-tight xl:text-5xl">
              {t('loginTitle')}
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-blue-100/90">
              {t('loginDescription')}
            </p>
          </div>
        </div>
      </div>
      <div className="mx-auto w-full max-w-md rounded-3xl border bg-card p-6 shadow-xl shadow-slate-900/5 sm:p-9">
        <div className="mb-7 rounded-2xl border bg-card p-3 shadow-sm lg:hidden">
          <img
            src={marca.data?.logo_url}
            alt="BR Mantenimiento General"
            width={400}
            height={112}
            className="mx-auto aspect-[25/7] max-h-28 w-full object-contain"
          />
        </div>
        <LoginForm />
        <a href="/bolsa-empleo" className="mt-5 block">
          <Button variant="outline" className="w-full">
            <BriefcaseBusiness className="mr-2 size-4" />
            Bolsa de empleo para técnicos
          </Button>
        </a>
      </div>
    </section>
  )
}
