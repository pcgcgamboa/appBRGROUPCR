import type { PropsWithChildren } from 'react'

export function AppShell({ children }: PropsWithChildren) {
  return (
    <div className="min-h-screen">
      <header className="border-b bg-white">
        <div className="container flex h-16 items-center font-semibold">
          Solicitudes de servicio
        </div>
      </header>
      <main className="container py-12">{children}</main>
    </div>
  )
}
