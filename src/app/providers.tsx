import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { PropsWithChildren } from 'react'
import { TooltipProvider } from '@/components/atoms/tooltip'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
})

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={300}>{children}</TooltipProvider>
    </QueryClientProvider>
  )
}
