import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Idioma = 'es' | 'en'

interface UiState {
  menuAbierto: boolean
  menuColapsado: boolean
  idioma: Idioma
  cambiarMenu: () => void
  cambiarMenuColapsado: () => void
  cambiarIdioma: (idioma: Idioma) => void
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      menuAbierto: false,
      menuColapsado: false,
      idioma: 'es',
      cambiarMenu: () => set((state) => ({ menuAbierto: !state.menuAbierto })),
      cambiarMenuColapsado: () => set((state) => ({ menuColapsado: !state.menuColapsado })),
      cambiarIdioma: (idioma) => set({ idioma }),
    }),
    {
      name: 'control-solicitudes-ui',
      partialize: ({ idioma, menuColapsado }) => ({ idioma, menuColapsado }),
    },
  ),
)
