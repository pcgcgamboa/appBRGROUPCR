import { create } from 'zustand'

interface UiState {
  menuAbierto: boolean
  cambiarMenu: () => void
}

export const useUiStore = create<UiState>((set) => ({
  menuAbierto: false,
  cambiarMenu: () => set((state) => ({ menuAbierto: !state.menuAbierto })),
}))
