import { registerSW } from 'virtual:pwa-register'
import { toast } from 'sonner'

export function registrarServiceWorker() {
  const actualizar = registerSW({
    onNeedRefresh() {
      toast('Hay una versión nueva disponible', {
        action: { label: 'Actualizar', onClick: () => actualizar(true) },
        duration: Infinity,
      })
    },
    onOfflineReady() {
      toast('Lista para funcionar sin conexión')
    },
  })
}
