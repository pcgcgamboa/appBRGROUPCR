import { createSupabaseWhatsappRepository } from '@/features/whatsapp/adapters/supabase-whatsapp-repository'
import type { WhatsappRepository } from '@/features/whatsapp/ports/whatsapp-repository'
import { supabase } from '@/lib/supabase'

export const whatsappRepository: WhatsappRepository = createSupabaseWhatsappRepository(supabase)
