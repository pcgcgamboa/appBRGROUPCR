import { LogOut } from 'lucide-react'
import { Button } from '@/components/atoms/button'
import { supabase } from '@/lib/supabase'

export function LogoutButton() {
  return (
    <Button variant="outline" onClick={() => void supabase?.auth.signOut()}>
      <LogOut className="mr-2 size-4" />
      Cerrar sesión
    </Button>
  )
}
