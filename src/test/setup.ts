import '@testing-library/jest-dom/vitest'

// jsdom no implementa ResizeObserver; varios primitivos de Radix (Checkbox, Select, etc., vía
// @radix-ui/react-use-size) lo requieren en su efecto de montaje y sin este stub el componente
// completo falla en render con "ResizeObserver is not defined" en cualquier test que lo use.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver
