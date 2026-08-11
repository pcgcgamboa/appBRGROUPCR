import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Idioma = 'es' | 'en'

interface UiState {
  menuAbierto: boolean
  idioma: Idioma
  cambiarMenu: () => void
  cambiarIdioma: (idioma: Idioma) => void
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      menuAbierto: false,
      idioma: 'es',
      cambiarMenu: () => set((state) => ({ menuAbierto: !state.menuAbierto })),
      cambiarIdioma: (idioma) => set({ idioma }),
    }),
    { name: 'control-solicitudes-ui', partialize: ({ idioma }) => ({ idioma }) },
  ),
)
