import { useEffect, useState } from 'react'

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine,
  )

  useEffect(() => {
    const marcarEnLinea = () => setIsOnline(true)
    const marcarSinConexion = () => setIsOnline(false)
    window.addEventListener('online', marcarEnLinea)
    window.addEventListener('offline', marcarSinConexion)
    return () => {
      window.removeEventListener('online', marcarEnLinea)
      window.removeEventListener('offline', marcarSinConexion)
    }
  }, [])

  return { isOnline }
}
