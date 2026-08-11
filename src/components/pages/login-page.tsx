import { BarChart3, ClipboardCheck, ShieldCheck } from 'lucide-react'
import { LoginForm } from '@/components/organisms/login-form'
import { useI18n } from '@/lib/i18n'

export function LoginPage() {
  const { t } = useI18n()
  const beneficios = [
    { icon: ShieldCheck, text: t('secureAccess') },
    { icon: ClipboardCheck, text: t('liveTracking') },
    { icon: BarChart3, text: t('clearReports') },
  ]

  return (
    <section className="mx-auto grid min-h-[calc(100vh-10rem)] max-w-6xl items-center gap-8 py-6 lg:grid-cols-[1.15fr_0.85fr] lg:gap-14">
      <div className="relative hidden overflow-hidden rounded-[2rem] bg-gradient-to-br from-blue-950 via-blue-900 to-primary p-10 text-white shadow-2xl lg:block lg:min-h-[620px]">
        <div className="absolute -right-24 -top-24 size-72 rounded-full bg-cyan-300/20 blur-3xl" />
        <div className="absolute -bottom-32 -left-20 size-80 rounded-full bg-blue-400/20 blur-3xl" />
        <div className="relative flex h-full flex-col justify-between">
          <div>
            <div className="mb-16 flex size-14 items-center justify-center rounded-2xl border border-white/20 bg-white/10 backdrop-blur">
              <ClipboardCheck className="size-7" />
            </div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-200">
              {t('loginEyebrow')}
            </p>
            <h1 className="mt-5 max-w-xl text-4xl font-bold leading-tight tracking-tight xl:text-5xl">
              {t('loginTitle')}
            </h1>
            <p className="mt-6 max-w-lg text-base leading-7 text-blue-100/90">
              {t('loginDescription')}
            </p>
          </div>
          <div className="grid gap-3">
            {beneficios.map(({ icon: Icon, text }) => (
              <div
                key={text}
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-medium backdrop-blur"
              >
                <Icon className="size-5 text-cyan-200" />
                {text}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="mx-auto w-full max-w-md rounded-3xl border bg-white p-6 shadow-xl shadow-slate-900/5 sm:p-9">
        <LoginForm />
      </div>
    </section>
  )
}
