import type { InputHTMLAttributes } from 'react'
import { Input } from '@/components/atoms/input'

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
}

export function FormField({ label, error, id, ...props }: FormFieldProps) {
  return (
    <label htmlFor={id} className="grid gap-2 text-sm font-medium">
      {label}
      <Input
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        {...props}
      />
      {error && (
        <span id={`${id}-error`} className="text-sm text-red-700">
          {error}
        </span>
      )}
    </label>
  )
}
