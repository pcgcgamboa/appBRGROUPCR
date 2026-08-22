export function AvisoSupabaseNoConfigurado() {
  return (
    <div className="mx-auto max-w-xl rounded-2xl border border-warning/30 bg-warning-soft p-6 text-sm text-warning-soft-foreground shadow-sm">
      Copie <code>.env.example</code> como <code>.env.local</code> y configure las credenciales de
      Supabase para habilitar la autenticación.
    </div>
  )
}
