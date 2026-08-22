import { forwardRef } from 'react'

interface CampoConError {
  id: string
  label: string
}

export const FormErrorSummary = forwardRef<HTMLDivElement, { errors: CampoConError[] }>(
  ({ errors }, ref) => {
    if (!errors.length) return null
    return (
      <div
        ref={ref}
        role="alert"
        tabIndex={-1}
        aria-labelledby="resumen-errores-titulo"
        className="rounded-md border border-destructive/30 bg-destructive-soft p-4 text-sm text-destructive-soft-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:col-span-2"
      >
        <p id="resumen-errores-titulo" className="font-semibold">
          Revise {errors.length === 1 ? 'el siguiente campo' : 'los siguientes campos'} antes de continuar
        </p>
        <ul className="mt-2 list-inside list-disc space-y-1">
          {errors.map((error) => (
            <li key={error.id}>
              <a href={`#${error.id}`} className="underline underline-offset-2 hover:no-underline">
                {error.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    )
  },
)

FormErrorSummary.displayName = 'FormErrorSummary'
