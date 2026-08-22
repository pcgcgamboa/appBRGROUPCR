import { AppRouter } from '@/app/router'
import { Toaster } from '@/components/atoms/sonner'

export function App() {
  return (
    <>
      <AppRouter />
      <Toaster />
    </>
  )
}
