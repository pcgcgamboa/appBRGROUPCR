import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, renderHook } from '@testing-library/react'
import type { PropsWithChildren, ReactElement } from 'react'

// Wrapper deliberadamente liviano: NO reutiliza `AppProviders` (src/app/providers.tsx) porque ese
// arrastra `SessionProvider` (sesión real de Supabase) y un `QueryClient` compartido entre
// renders. Aquí cada test recibe un `QueryClient` nuevo con `retry: false` para que un mock de
// repositorio que rechaza falle rápido en vez de reintentar y hacer lento el test.
//
// Convención para sustituir un repositorio de dominio por un fake en un test de hook/componente:
//   vi.mock('@/features/<dominio>/lib/repository', () => ({
//     <dominio>Repository: { metodoUsado: vi.fn().mockResolvedValue(valorDeEjemplo) },
//   }))
// El fake solo necesita implementar los métodos que el hook/componente bajo prueba realmente
// llama — no la interfaz `Port` completa.
function crearQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
}

function Wrapper({ children }: PropsWithChildren) {
  return <QueryClientProvider client={crearQueryClient()}>{children}</QueryClientProvider>
}

export function renderConProviders(ui: ReactElement) {
  return render(ui, { wrapper: Wrapper })
}

export function renderHookConProviders<TProps, TResult>(hook: (props: TProps) => TResult) {
  return renderHook(hook, { wrapper: Wrapper })
}
