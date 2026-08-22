import { Toaster as SonnerToaster } from 'sonner'

export function Toaster() {
  return (
    <SonnerToaster
      theme="light"
      position="top-right"
      toastOptions={{
        classNames: {
          toast: 'rounded-lg border bg-popover text-popover-foreground shadow-lg text-sm p-4',
          title: 'font-semibold',
          description: 'text-muted-foreground',
          actionButton:
            'bg-primary text-primary-foreground rounded-md px-3 py-1.5 text-xs font-semibold',
          cancelButton:
            'bg-muted text-muted-foreground rounded-md px-3 py-1.5 text-xs font-semibold',
          success: 'data-[type=success]:border-success/30',
          error: 'data-[type=error]:border-destructive/30',
        },
      }}
    />
  )
}
